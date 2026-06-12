const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'public/logo.svg'),
  });

  // 开发环境
  if (process.env.NODE_ENV === 'development') {
    // 启动Next.js开发服务器
    nextProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true,
    });

    // 等待服务器启动后加载
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:3000');
    }, 5000);
  } else {
    // 生产环境 - 加载构建后的文件
    mainWindow.loadFile(path.join(__dirname, '.next/server/pages/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (nextProcess) {
      nextProcess.kill();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});