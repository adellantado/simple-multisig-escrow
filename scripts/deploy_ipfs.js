const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function deployToIPFS() {
  try {
    console.log('Building project...');
    execSync('npm run build', { stdio: 'inherit' });
    
    const distPath = path.join(__dirname, '..', 'dist');
    
    if (!fs.existsSync(distPath)) {
      throw new Error('dist folder not found. Make sure to run npm run build first.');
    }
    
    console.log('Adding dist folder to IPFS...');
    const result = execSync('ipfs add -r dist', { 
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8' 
    });
    
    console.log('IPFS add result:');
    console.log(result);
    
    // Extract the CID from the last line (which contains the root directory)
    const lines = result.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    const cidMatch = lastLine.match(/([a-zA-Z0-9]{46,})/);
    
    if (cidMatch) {
      const cid = cidMatch[1];
      console.log('\n✅ Deployment successful!');
      console.log('IPFS Hash:', cid);
      console.log('Access your site at: https://ipfs.io/ipfs/' + cid);
      console.log('Or locally at: http://localhost:8080/ipfs/' + cid);
    }
    
  } catch (error) {
    console.error('Error deploying to IPFS:', error.message);
    process.exit(1);
  }
}

deployToIPFS();
