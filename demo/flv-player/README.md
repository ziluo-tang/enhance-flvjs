# flv-demo
调用播放器：
iframe src指向播放器html文件，
e.g './player/player.html?stream=https://mister-ben.github.io/videojs-flvjs/bbb.flv&width=400&height=300'
参数：
stream: flv流地址
width: iframe窗口宽，px
height: iframe窗口高，px
默认自动播放

其他操作
1，开始播放
iframe.contentWindow.postMessage({
	action: 'start'
}, "*");

2，暂停播放
iframe.contentWindow.postMessage({
	action: 'pause'
}, "*");

3，关闭播放器
iframe.contentWindow.postMessage({
	action: 'destory'
}, "*");

4，截图
点击播放器截图按钮，直接下载截图


注：实际开发中，建议postMessage第二个参数修改为iframe内嵌页面播放器窗口URI