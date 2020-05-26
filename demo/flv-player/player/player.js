const INIT = 'init', 
    START = 'start', 
    PAUSE = 'pause', 
    DESTORY = 'destory', 
    DISCONNECT = 'disconnect',
    CURRENTTIME = 'currentTime',
    SHOTIMAGE = 'shotImage',
    BSERURL = 'http://33.95.241.120:8008';

const Util = {
    checkStream(stream) {
        const index = stream.lastIndexOf('.');
        const suffix = stream.substring(index+1);
        if(suffix==='flv'){
            return true;
        }else{
            console.error('格式不支持');
            return false;
        }
    },
    base64ToBlob(code) {
        let parts = code.split(';base64,');
        let contentType = parts[0].split(':')[1];
        let raw = window.atob(parts[1]);
        let rawLength = raw.length;
        let uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }
        return new Blob([uInt8Array], {type: contentType});
    }

};

class Player{
    constructor(config = {}) {
        this.config = config;
    }
    create() {
        const player = document.getElementById('player');
        if (flvjs.isSupported()) {
            if (this.pInstance) {
                this.destory();
            }
            this.pInstance = flvjs.createPlayer({
                type: 'flv',
                url: this.config.stream,
                hasVideo: true,
                hasAudio: false,
                isLive: true,
                cors: true
            },{
                enableWorker: true,
                enableStashBuffer: false,
                stashInitialSize: 120,
                autoCleanupSourceBuffer: true,
                autoCleanupMaxBackwardDuration: 5,
                autoCleanupMinBackwardDuration: 3,
                lazyLoadMaxDuration: 3 * 60,
                seekType: 'range'
            });
            this.pInstance.attachMediaElement(player);
            this.load();
            this.play();
        }
    }
    load() {
        this.pInstance.load();
    }
    play() {
        this.pInstance.play();
    }
    pause() {
        this.pInstance.pause();
    }
    reconnect() {
        let times = 0;
        const interval = setInterval(() => {
            console.info(++times+'times reconnect...');
            fetch(`${this.config.reconnectAPI || BSERURL}/v1/gb/stream/start`, {
                body: JSON.stringify({
                    appId: this.config.appid,
                    deviceId: this.config.deviceid,
                    type: "flv"
                }),
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            })
            .then(res => {
                if(res.ok){
                    clearInterval(interval);
                    let json = res.json();
                    this.stream = json.data[0].playUrl;
                    this.init();
                }else{
                    console.error(res.message);
                }
                if(times>100 && interval){
                    clearInterval(interval);
                }
            })
            .catch(err => {
                throw new Error(err);
            });
        }, 2000);
    }
    destory() {
        this.pInstance.pause();
        this.pInstance.unload();
        this.pInstance.detachMediaElement();
        this.pInstance.destroy();
        this.pInstance = null;
    }
    screenshot() {
        const canvas = document.createElement("canvas");
        const video = document.getElementById('player');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const canvasCtx = canvas.getContext("2d");
        canvasCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const shotUrl = canvas.toDataURL("image/png");
        window.parent.postMessage({
            action: 'shotImage',
            result: {
                imageBase64: shotUrl
            }
        }, '*');
        // var aLink = document.createElement('a');
        // var blob = Util.base64ToBlob(shotUrl); 
        // aLink.download = '截图.png';
        // aLink.href = URL.createObjectURL(blob);
        // aLink.click();
    }
    getCurrentTime() {
        window.parent.postMessage({
            action: 'currentTime',
            result: {
                time: document.getElementById('player').currentTime
            }
        }, '*');
    }
}

const init = (searchs) => {
    searchs = searchs.substring(1).split('&');
    var config = new Object();
    searchs.forEach(item => {
        const param = item.split('=');
        config[param[0].toLowerCase()] = param[1];
    });
    if(config.stream && Util.checkStream(config.stream)){
        const szPlayer = new Player(config);
        szPlayer.create();
        return szPlayer;
    }else{
        console.error('没有流地址');
        return;
    }
};

let searchs = window.location.search, szPlayer;
if(searchs){
    szPlayer = init(searchs);
}

window.addEventListener('message', function(event){
    if(szPlayer){
        switch(event.data.action) {
            case INIT:  szPlayer.create();
                break;
            case START: szPlayer.play();
                break;
            case PAUSE: szPlayer.pause();
                break;
            case DESTORY: szPlayer.destory();
                break;
            case DISCONNECT: szPlayer.reconnect();
                break;
            case CURRENTTIME: szPlayer.getCurrentTime();
                break;
            case SHOTIMAGE: szPlayer.screenshot();
                break;
            default: 
                break;
        }  
    }
}, false);

document.addEventListener('visibilitychange',function(){ //浏览器切换事件
    if(document.visibilityState=='visible') {
        szPlayer.create();
    }
});