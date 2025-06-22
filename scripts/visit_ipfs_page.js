const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

function startIPFSAndLaunchWebsite() {
  try {
    console.log('Starting IPFS daemon...');
    
    // Start IPFS daemon in the background
    const ipfsDaemon = spawn('ipfs', ['daemon'], {
      stdio: 'pipe',
      detached: true
    });
    
    // Wait a moment for the daemon to start
    setTimeout(() => {
      console.log('IPFS daemon started successfully');
      
      // Check if IPFS_PAGE environment variable is set
      const ipfsPage = process.env.IPFS_PAGE;
      if (!ipfsPage) {
        console.error('Error: IPFS_PAGE environment variable is not set');
        console.log('Please set IPFS_PAGE to the CID of your deployed website');
        console.log('Example: export IPFS_PAGE=QmYourCIDHere');
        process.exit(1);
      }
      
      console.log('Launching website at IPFS page:', ipfsPage);
      
      // Open the website in the default browser
      const url = `http://localhost:8080/ipfs/${ipfsPage}`;
      console.log('Opening:', url);
      
      // Use platform-specific commands to open the browser
      const platform = process.platform;
      let command;
      
      if (platform === 'darwin') {
        command = 'open';
      } else if (platform === 'win32') {
        command = 'start';
      } else {
        command = 'xdg-open';
      }
      
      execSync(`${command} "${url}"`, { stdio: 'inherit' });
      
      console.log('✅ Website launched successfully!');
      console.log('IPFS daemon is running in the background');
      console.log('To stop the daemon, run: ipfs shutdown');
      
    }, 2000);
    
  } catch (error) {
    console.error('Error starting IPFS and launching website:', error.message);
    process.exit(1);
  }
}

startIPFSAndLaunchWebsite();
