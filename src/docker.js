const Docker = require('dockerode');
const crypto = require('crypto');
const db = require('./db');

const docker = new Docker(
  process.platform === 'win32'
    ? { socketPath: '//./pipe/docker_engine' }
    : { socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' }
);

const DB_HOST = process.env.DB_HOST || 'localhost';
const PORT_MIN = parseInt(process.env.PORT_MIN) || 10000;
const PORT_MAX = parseInt(process.env.PORT_MAX) || 20000;

const DB_TYPES = {
  postgresql: {
    image: 'postgres:16-alpine',
    internalPort: 5432,
    env: (user, pass, dbName) => [
      `POSTGRES_USER=${user}`,
      `POSTGRES_PASSWORD=${pass}`,
      `POSTGRES_DB=${dbName}`
    ],
    url: (host, port, user, pass, dbName) =>
      `postgresql://${user}:${pass}@${host}:${port}/${dbName}`
  },
  mongodb: {
    image: 'mongo:7',
    internalPort: 27017,
    env: (user, pass, dbName) => [
      `MONGO_INITDB_ROOT_USERNAME=${user}`,
      `MONGO_INITDB_ROOT_PASSWORD=${pass}`,
      `MONGO_INITDB_DATABASE=${dbName}`
    ],
    url: (host, port, user, pass, dbName) =>
      `mongodb://${user}:${pass}@${host}:${port}/${dbName}?authSource=admin`
  },
  mysql: {
    image: 'mysql:8',
    internalPort: 3306,
    env: (user, pass, dbName) => [
      `MYSQL_ROOT_PASSWORD=${pass}`,
      `MYSQL_USER=${user}`,
      `MYSQL_PASSWORD=${pass}`,
      `MYSQL_DATABASE=${dbName}`
    ],
    url: (host, port, user, pass, dbName) =>
      `mysql://${user}:${pass}@${host}:${port}/${dbName}`
  },
  redis: {
    image: 'redis:7-alpine',
    internalPort: 6379,
    env: () => [],
    cmd: (pass) => ['redis-server', '--requirepass', pass],
    url: (host, port, _user, pass) =>
      `redis://:${pass}@${host}:${port}`
  },
  mariadb: {
    image: 'mariadb:11',
    internalPort: 3306,
    env: (user, pass, dbName) => [
      `MARIADB_ROOT_PASSWORD=${pass}`,
      `MARIADB_USER=${user}`,
      `MARIADB_PASSWORD=${pass}`,
      `MARIADB_DATABASE=${dbName}`
    ],
    url: (host, port, user, pass, dbName) =>
      `mysql://${user}:${pass}@${host}:${port}/${dbName}`
  }
};

function getAvailablePort() {
  const usedPorts = new Set(db.prepare('SELECT port FROM databases').all().map(r => r.port));
  for (let port = PORT_MIN; port <= PORT_MAX; port++) {
    if (!usedPorts.has(port)) return port;
  }
  throw new Error('No available ports');
}

function generateCredentials() {
  return {
    username: 'user_' + crypto.randomBytes(4).toString('hex'),
    password: crypto.randomBytes(16).toString('hex'),
    dbName: 'db_' + crypto.randomBytes(4).toString('hex')
  };
}

async function pullImage(image) {
  const images = await docker.listImages();
  const exists = images.some(img => img.RepoTags && img.RepoTags.includes(image));
  if (exists) return;

  return new Promise((resolve, reject) => {
    docker.pull(image, (err, stream) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

async function createDatabase(name, type) {
  const config = DB_TYPES[type];
  if (!config) throw new Error(`Type non supporté: ${type}`);

  const id = crypto.randomUUID();
  const port = getAvailablePort();
  const { username, password, dbName } = generateCredentials();
  const connectionUrl = config.url(DB_HOST, port, username, password, dbName);

  db.prepare(`
    INSERT INTO databases (id, name, type, port, username, password, db_name, connection_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'creating')
  `).run(id, name, type, port, username, password, dbName, connectionUrl);

  try {
    await pullImage(config.image);

    const containerConfig = {
      Image: config.image,
      name: `makeadb-${id}`,
      Env: config.env(username, password, dbName),
      HostConfig: {
        PortBindings: {
          [`${config.internalPort}/tcp`]: [{ HostPort: port.toString() }]
        },
        RestartPolicy: { Name: 'unless-stopped' }
      },
      ExposedPorts: {
        [`${config.internalPort}/tcp`]: {}
      }
    };

    if (config.cmd) {
      containerConfig.Cmd = config.cmd(password);
    }

    const container = await docker.createContainer(containerConfig);
    await container.start();

    db.prepare('UPDATE databases SET container_id = ?, status = ? WHERE id = ?')
      .run(container.id, 'running', id);

    return db.prepare('SELECT * FROM databases WHERE id = ?').get(id);
  } catch (err) {
    db.prepare('UPDATE databases SET status = ? WHERE id = ?').run('error', id);
    throw err;
  }
}

async function deleteDatabase(id) {
  const record = db.prepare('SELECT * FROM databases WHERE id = ?').get(id);
  if (!record) throw new Error('Base introuvable');

  if (record.container_id) {
    try {
      const container = docker.getContainer(record.container_id);
      try { await container.stop(); } catch (e) {}
      await container.remove({ v: true });
    } catch (e) {}
  }

  db.prepare('DELETE FROM databases WHERE id = ?').run(id);
}

async function startDatabase(id) {
  const record = db.prepare('SELECT * FROM databases WHERE id = ?').get(id);
  if (!record || !record.container_id) throw new Error('Base introuvable');

  const container = docker.getContainer(record.container_id);
  await container.start();
  db.prepare('UPDATE databases SET status = ? WHERE id = ?').run('running', id);
  return db.prepare('SELECT * FROM databases WHERE id = ?').get(id);
}

async function stopDatabase(id) {
  const record = db.prepare('SELECT * FROM databases WHERE id = ?').get(id);
  if (!record || !record.container_id) throw new Error('Base introuvable');

  const container = docker.getContainer(record.container_id);
  await container.stop();
  db.prepare('UPDATE databases SET status = ? WHERE id = ?').run('stopped', id);
  return db.prepare('SELECT * FROM databases WHERE id = ?').get(id);
}

async function syncContainers() {
  const records = db.prepare('SELECT * FROM databases').all();
  for (const record of records) {
    if (!record.container_id) continue;
    try {
      const container = docker.getContainer(record.container_id);
      const info = await container.inspect();
      const status = info.State.Running ? 'running' : 'stopped';
      db.prepare('UPDATE databases SET status = ? WHERE id = ?').run(status, record.id);
    } catch (e) {
      db.prepare('UPDATE databases SET status = ? WHERE id = ?').run('error', record.id);
    }
  }
}

async function checkDocker() {
  try {
    await docker.ping();
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  DB_TYPES,
  createDatabase,
  deleteDatabase,
  startDatabase,
  stopDatabase,
  syncContainers,
  checkDocker
};
