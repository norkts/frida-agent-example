import { log } from "./logger.js";
import {Context} from "node:vm";

console.log(this);
const header = Memory.alloc(16);
header
    .writeU32(0xdeadbeef).add(4)
    .writeU32(0xd00ff00d).add(4)
    .writeU64(uint64("0x1122334455667788"));
log(hexdump(header.readByteArray(16) as ArrayBuffer, { ansi: true }));

function hook_ssl_verify_result(address: NativePointerValue)
{
    console.log("Hooking ssl_verify_result")
    Interceptor.attach(address, {
        onEnter: function(args) {
            console.log("Disabling SSL validation")
        },
        onLeave: function(retval)
        {
            console.log("Retval: " + retval)
            retval.replace(ptr(0x1));
        }
    });
}
function disablePinning(){
    // Change the offset on the line below with the binwalk result
    // If you are on 32 bit, add 1 to the offset to indicate it is a THUMB function: .add(0x1)
    // Otherwise, you will get 'Error: unable to intercept function at ......; please file a bug'
    const packagePcMap:{[key:string]:number} = {
        "com.xiaobuniao.cat": 0x6dbef4,
        "com.duoduolive.party":  0x5dc570,
        "voice.taoziplanet.com": 0x6DBEF4,
        "com.yuyin.youtingyuyin": 0x596870,
        "com.weekool.voice": 0xA8584C,
        "com.sound.wekool": 0xA8584C,
        "com.boto.world": 0x6C4C20,
        "com.fxwl.tuyouda": 0x596870,
        "voice.ananplanet.com": 0x6dbef4,
    };
    // const pc = packagePcMap[packagename];
    // log("ssl_start_pc:"+pc)
    // if(!pc){
    //     return;
    // }

    var address = Module.findBaseAddress('libflutter.so')?.add(0x6dbef4)

    if(address){
        hook_ssl_verify_result(address);
    }
}

function findBaseAddress(name:string){
    var resModule:Module ;
    Process.enumerateModules().forEach(module => {
        log("Module: " + module.name + ", Base Address: " + module.base)
        if(module.name == name){
            resModule = module;
        }
    });
    if(resModule!){
        log("Module: " + resModule.name + ", Base Address: " + resModule.base);
        return resModule.base;
    }
    return null;
}

disablePinning();
// hook_huanxin();

//hook环信
function hook_huanxin(){
    Java.perform(function() {
        var EMClient = Java.use("com.hyphenate.chat.EMClient");
        EMClient.init.implementation = function(context:any, options:any) {
            console.log("options: " + options.getAppKey());
            // hook init
            return this.init.call(this, context,  options);
        };

        //com.hyphenate.chat.EMChatRoomManager#joinChatRoom
        var EMChatRoomManager = Java.use("com.hyphenate.chat.EMChatRoomManager");
        EMChatRoomManager.joinChatRoom.implementation = function(chatRoomId:string, listener:any) {
            console.log("joinChatRoom - chatRoomId: " + chatRoomId);
            // hook joinChatRoom
            return this.joinChatRoom.call(this, chatRoomId, listener);
        };
    });
}

//hook java com.tencent.imsdk.v2.V2TIMManagerImpl#initSDK
function hook_tencent_imsdk(){
    Java.perform(function() {
        var V2TIMManagerImpl = Java.use("com.tencent.imsdk.v2.V2TIMManagerImpl");

        V2TIMManagerImpl.initSDK.overload("android.content.Context", "int", "com.tencent.imsdk.v2.V2TIMSDKConfig", "com.tencent.imsdk.v2.V2TIMSDKListener").implementation = function( context:Context, sdkAppID:number, V2TIMSDKConfig:object, listener:any) {
            console.log("initSDK: " + sdkAppID);
            // hook initSDK
            return this.initSDK.call(this, context, sdkAppID,V2TIMSDKConfig,listener);
        };

        V2TIMManagerImpl.login.implementation = function( userID:string, userSig:string,callback:any) {
            console.log("login - userID: " + userID + ",userSig:" + userSig);
            // hook login
            return this.login.call(this, userID, userSig,callback);
        };

        V2TIMManagerImpl.joinGroup.implementation = function( groupID:string, message:string,callback:any) {
            console.log("joinGroup - userID: " + groupID + ",message:" + message);
            // hook joinGroup
            return this.joinGroup.call(this, groupID, message, callback);
        };
    });
}
