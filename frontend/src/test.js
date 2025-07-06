console.log('test.js loading...')

// Hide loading screen
const loadingElement = document.getElementById('loading')
if (loadingElement) {
  console.log('Found loading element, hiding it')
  loadingElement.style.opacity = '0'
  setTimeout(() => {
    loadingElement.remove()
    console.log('Loading element removed')
  }, 300)
} else {
  console.log('Loading element not found')
}

// Test basic DOM manipulation
setTimeout(() => {
  const appElement = document.getElementById('app')
  if (appElement) {
    appElement.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1>JavaScript测试页面</h1>
        <p>如果你能看到这个页面，说明JavaScript基本功能正常</p>
        <button onclick="alert('按钮点击成功!')" style="padding: 8px 16px; margin: 8px; cursor: pointer; background: #18a058; color: white; border: none; border-radius: 4px;">
          点击测试
        </button>
        <div style="margin-top: 20px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
          <p><strong>当前时间:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>用户代理:</strong> ${navigator.userAgent}</p>
          <p><strong>页面URL:</strong> ${window.location.href}</p>
        </div>
      </div>
    `
    console.log('Basic HTML content inserted')
  } else {
    console.error('App element not found')
  }
}, 500)
