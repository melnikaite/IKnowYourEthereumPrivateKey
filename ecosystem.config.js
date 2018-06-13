require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'IKnowYourEthereumPrivateKey',
      script: 'index.js',
    },
  ],

  deploy: {
    production: {
      user: process.env.DEPLOY_USER,
      host: process.env.DEPLOY_HOST,
      ref: 'origin/master',
      repo: 'git@github.com:melnikaite/IKnowYourEthereumPrivateKey.git',
      path: '/var/apps/IKnowYourEthereumPrivateKey',
      'post-deploy': 'npm ci && pm2 reload ecosystem.config.js --env production'
    },
  }
};
