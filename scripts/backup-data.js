const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configure Git
function configureGit() {
  try {
    execSync('git config user.name "Backup Bot"');
    execSync('git config user.email "backup@ordinalsmint.com"');
  } catch (error) {
    console.error('Error configuring Git:', error);
    throw error;
  }
}

// Check if there are changes to commit
function hasChanges() {
  try {
    const status = execSync('git status --porcelain').toString();
    return status.length > 0;
  } catch (error) {
    console.error('Error checking Git status:', error);
    return false;
  }
}

// Main backup function
async function backupData() {
  try {
    // Configure Git
    configureGit();

    // Add all files in the data directory
    execSync('git add data/*.json');

    // Only commit and push if there are changes
    if (hasChanges()) {
      const timestamp = new Date().toISOString();
      execSync(`git commit -m "Automatic backup ${timestamp}"`);
      execSync('git push');
      console.log('Backup completed successfully');
    } else {
      console.log('No changes to backup');
    }
  } catch (error) {
    console.error('Backup failed:', error);
  }
}

// Run backup
backupData(); 