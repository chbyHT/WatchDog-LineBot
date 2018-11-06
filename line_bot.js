var linebot = require('linebot');
var app = require('express')();
var https = require('https');
var fs = require('fs');
var firebase = require("firebase");

var caPath = 'SSL/ca_bundle.pem'
var keyPath = 'SSL/private.key';
var certPath = 'SSL/certificate.pem';
var hsca = fs.readFileSync(caPath);  //ssl
var hskey = fs.readFileSync(keyPath);
var hscert = fs.readFileSync(certPath);

var server = https.createServer({//設定SSL
	key: hskey,
    cert: hscert,
	ca:hsca
}, app);

var bot = linebot({  //設定linebot
    channelId: 'xxxxx',
    channelSecret: 'xxxxxxxxxxxxxxxx',
    channelAccessToken: 'xxxxxxxxxxxxxxx'
  });
  
var config = {  //設定firebase
    apiKey : "xxxxxxxxxxxxxxx",
    authDomain : "watchdog-xxxxxxxxxxxxxxx",
    databaseURL : "xxxxxxxxxxxxxxx",
    storageBucket : "watchdog-xxxxxxxxxxxxxxx"
    }
firebase.initializeApp(config);

const linebotParser = bot.parser();
app.post('/', linebotParser);

// var ref =  firebase.database().ref("status/")  		
firebase.database().ref("status/").on("value",(event) =>{//監聽按門鈴
	if(event.val().butten == true){
		bot.push('C98b5c524b22b07746d4710bcf2f32da1','🔔叮咚  有人拜訪囉！'); //群組
	}
})

bot.on('message', async(event) => {
    let  username = ''
    let  msg = event.message.text;  //使用者回話
    await event.source.profile().then((profile) => { //取得用戶名
        username = profile.displayName
        console.log('\x1b[34m%s\x1b[0m','群組：'+ event.source.groupId + '：');//取得群組ID
        console.log('\x1b[36m%s\x1b[0m','用戶：'+ event.source.userId + '：');//取得用戶ID
        console.log('\x1b[33m%s\x1b[0m',username+'：'+msg)
    });	
    let userAccount = []
 	await firebase.database().ref("/account/").once("value", (snapshot)=> {
		userAccount = Object.values(snapshot.val())
    });
    var doorST = ''
	var lockST = ''
	await firebase.database().ref("/status/").once("value", (snapshot)=> {
		doorST = snapshot.val().doorST
		lockST = snapshot.val().lockST
    });
    
	let inAccount = false
	await userAccount.map((val,index)=>{  //確認權限
		// console.log(val.lineID);
		if(val.lineID == event.source.userId){
			inAccount = true
            console.log("找到了");
		}
    })
    let replayMAG=async(msg)=>{
        if(msg == '幫助' || msg == 'help'){
            return '💡使用方式💡\n\n[ 開門 ] 將鎖開啟\n[ 鎖門 ] 將鎖鎖上\n[ 狀態 ] 查看門與鎖的狀態\n[ 傳送 ] 選擇訊息傳送至門鈴\n[ 自訂訊息 ]say +英文字串(16字)'
        }
        if(msg == '狀態' ){
			doorST ? (door = '開著'):(door = '關著')
			lockST ? (lock = '開著'):(lock = '鎖著')
			return '🚪：'+door+'\n🔒：'+lock
		}
        if(msg == '開門' || msg == '開鎖'){
            if(lockST == true){
                return '鎖已經是開著的囉'
            }else{
                firebase.database().ref("/status/").update({lockST: true})
                return '鎖打開了！'
            }
        }	
        if(msg == '關門' || msg == '鎖門' ){
            if(doorST == true){
                return '請先將門關上！'
            }else if(lockST == false){
                return '已經是鎖上的狀態了'
            }else{
                firebase.database().ref("/status/").update({lockST: false})
                return '門鎖好了！'
            }
        }
        if(msg == '警報' ){
            return({
                "type": "template",
                "altText": "即將啟動警報器",
                "template": {
                      "type": "confirm",
                    "text": "打開警報嗎?",
                    "actions": [
                      {
                        "type": "message",
                        "label": "是",
                        "text": "open alert"
                      },
                      {
                        "type": "message",
                        "label": "否",
                        "text": "stop alert"
                      }
                    ]
                }			
            });
        }
        
        if(msg == 'stop alert'){
            firebase.database().ref("/status/").update({warning: false})
            return '警報已關閉！'
        }
        if(msg == 'open alert'){
            firebase.database().ref("/status/").update({warning: true})
            return '警報已開啟！'
        }
        
        if(msg == '傳送' || msg == '發送' || msg == '訊息'){
            return({
              "type": "template",
              "altText": "傳送訊息至門鈴",
              "template": {
                  "type": "buttons",
                  "text": "請選擇訊息",
                  "actions": [
                      {
                        "type": "message",
                        "label": "請稍等一下",
                        "text": "say Wait a moment"
                      },
                      {
                        "type": "message",
                        "label": "沒人在家",
                        "text": "say No one at home"
                      },
                      {
                        "type": "message",
                        "label": "請撥打手機聯絡",
                        "text": "say Call phone"
                      }
                  ]
              }
            });
        }
        
         if(typeof(msg)==='string'){
            if(msg.match(/^say/)){  //訊息至LCD
                if(msg.search(/[\u4e00-\u9fa5]+/) != -1){ //判斷中文
                    return '訊息內容不可含有中文'
                }else{
                    firebase.database().ref("/APP/").update({LCD: msg.slice(4)}) //過濾字串say
                    return '訊息已送出'
                }
            }
        }
       
    
    }
    if(inAccount){

        let replyMsg = await replayMAG(msg)
        
        event.reply(replyMsg)  //送出訊息
    }else if(msg=='ID' || msg=='id' || msg=='Id'){ //search ID
        event.reply('您的ID是：'+ event.source.userId )
    }else{
        event.reply("您沒有權限使用此功能")
        console.log("您沒有權限使用此功能");
    }
    
})



server.listen(process.env.PORT || 8080, ()=> {
    console.log('LineBot is running.');
  });