const { Service } = require('node-windows');
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'Elsewedy Attendance Backend',
  description: 'Elsewedy Time Management System Backend Service',
  script: path.join(__dirname, '../server.js'),
  nodeOptions: [
    '--max_old_space_size=4096'
  ],
  env: [
    {
      name: 'NODE_ENV',
      value: 'production'
    },
    {
      name: 'PORT',
      value: '3001'
    }
  ]
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install', function() {
  console.log('Service installed successfully');
  svc.start();
});

// Listen for the "start" event, which indicates the
// process is running as a service.
svc.on('start', function() {
  console.log('Service started successfully');
});

// Listen for the "stop" event, which indicates the
// process has stopped.
svc.on('stop', function() {
  console.log('Service stopped');
});

// Listen for the "uninstall" event, which indicates the
// process is no longer available as a service.
svc.on('uninstall', function() {
  console.log('Service uninstalled');
});

// Install the service
if (process.argv[2] === 'install') {
  svc.install();
} else if (process.argv[2] === 'uninstall') {
  svc.uninstall();
} else if (process.argv[2] === 'start') {
  svc.start();
} else if (process.argv[2] === 'stop') {
  svc.stop();
} else {
  console.log('Usage: node windows-service.js [install|uninstall|start|stop]');
}
