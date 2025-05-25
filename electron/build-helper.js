const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Path to the problematic file
const asarPath = path.join(__dirname, '..', 'dist', 'win-unpacked', 'resources', 'app.asar');

async function killAsarLock() {
  console.log('🔍 Looking for processes with handles on app.asar...');
  
  try {
    // First ensure all obvious processes are killed
    await execAsync('taskkill /F /IM Wingman.exe /T 2>nul');
    await execAsync('taskkill /F /IM electron.exe /T 2>nul');
    await execAsync('taskkill /F /IM node.exe /T 2>nul');
    
    console.log('⏳ Waiting for processes to fully terminate...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try an alternative approach - rename instead of delete
    console.log('🔄 Attempting to rename locked file...');
    const tmpName = `${asarPath}.old-${Date.now()}`;
    
    try {
      if (fs.existsSync(asarPath)) {
        fs.renameSync(asarPath, tmpName);
        console.log(`✅ Successfully renamed app.asar to ${path.basename(tmpName)}`);
        
        // Try to delete it later
        setTimeout(() => {
          try {
            if (fs.existsSync(tmpName)) {
              fs.unlinkSync(tmpName);
              console.log('🧹 Cleaned up old renamed asar file');
            }
          } catch (e) {
            // Ignore cleanup errors
          }
        }, 10000);
      } else {
        console.log('ℹ️ app.asar file not found, may have been already cleaned');
      }
    } catch (renameError) {
      console.error('❌ Rename approach failed:', renameError.message);
      
      // Last resort - schedule file deletion on next reboot
      console.log('⚡ Scheduling deletion on next system boot...');
      await execAsync(`reg add "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce" /v "DeleteAsarFile" /t REG_SZ /d "cmd /c del /F /Q ${asarPath}" /f`);
      console.log('✅ File will be deleted on next reboot');
    }
    
    console.log('🧹 Attempting to clean dist directory...');
  } catch (error) {
    console.error('❌ Error during process cleanup:', error.message);
  }
}

killAsarLock().then(() => {
  console.log('🏁 ASAR lock handling completed');
});