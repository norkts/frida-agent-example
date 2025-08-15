import { log } from "./logger.js";
import {Context} from "node:vm";
import Wrapper = Java.Wrapper;

const header = Memory.alloc(16);
header
    .writeU32(0xdeadbeef).add(4)
    .writeU32(0xd00ff00d).add(4)
    .writeU64(uint64("0x1122334455667788"));
log(hexdump(header.readByteArray(16) as ArrayBuffer, { ansi: true }));

const packagename = getPackageName();

function getPackageName(){
    const cmdline = new File("/proc/self/cmdline", "r");
    const packageName = cmdline.readLine();
    cmdline.close();
    return packageName;
}
function hook_ssl_verify_result(address: NativePointerValue)
{
    console.log("Hooking ssl_verify_result")
    Interceptor.attach(address, {
        onEnter: function(args) {
            // console.log("Disabling SSL validation")
        },
        onLeave: function(retval)
        {
            // console.log("Retval: " + retval)
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
        "com.jixing.party": 0xA8584C,
        "com.boto.world": 0x6C4C20,
        "com.fxwl.tuyouda": 0x596870,
        "voice.ananplanet.com": 0x6dbef4,
        "com.jingjing.party": 0x6dbef4,
        "com.yuyin.yunduanpaidui": 0x596870,
        "com.happy8.miyovoice":0x5fdf60,
    };
    const sslAddr = packagePcMap[packagename];
    log("ssl_start_pc:"+sslAddr)
    if(!sslAddr){
        return;
    }

    var address = Module.findBaseAddress('libflutter.so')?.add(sslAddr)

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

// hookRongIM();
disablePinning();
// hookHawk();
// hook_tencent_imsdk();
// hookNim();
hook_huanxin();

function hookHawk(){
    Java.perform(function() {
        var Hawk = Java.use("com.orhanobut.hawk.Hawk");
        Hawk.get.overload("java.lang.String").implementation = function(key:any) {
            // hook init
            let res = this.get.call(this, key);
            console.log("Hawk.get: key=" + key + ",val=" + JSON.stringify(res));
            return res;
        };
    });
}
function hook_huanxin(){
    Java.perform(function() {
        var EMClient = Java.use("com.hyphenate.chat.EMClient");
        EMClient.init.implementation = function(context:any, options:any) {
            console.log("init,options= " + object2string(options));
            // hook init
            return this.init.call(this, context,  options);
        };

        EMClient._login.implementation = function (username:string, token:string, callback:any, bool1:any, bool2:any) {
            console.log("login:username=" + username + ", token=" + token);
            // hook init
            return this._login.call(this, username, token, callback, bool1, bool2);
        };

        //com.hyphenate.chat.EMChatRoomManager#joinChatRoom
        var EMChatRoomManager = Java.use("com.hyphenate.chat.EMChatRoomManager");
        EMChatRoomManager.joinChatRoom.overload('java.lang.String', 'boolean', 'java.lang.String', 'com.hyphenate.EMValueCallBack').implementation = function(chatRoomId:string, bool:boolean, reason:string, listener:any) {
            console.log("joinChatRoom - chatRoomId: " + chatRoomId);
            // hook joinChatRoom
            return this.joinChatRoom.call(this, chatRoomId, bool, reason, listener);
        };

        var methodCallWrapper = Java.use("s3.w4");
        methodCallWrapper.onMethodCall.implementation = function(methodCall:any, result:any) {
            const res = this.onMethodCall.call(this, methodCall, result);
            // console.log("onMethodCall - method: " + methodCall.method.value + ",result=" + object2string(result) + ", param:" + methodCall.arguments());
            return res;
        }
    });
}

function object2string(obj: any, maxDepth: number = 3, currentDepth: number = 0): string {
    // 处理null或undefined
    if (obj === null || obj === undefined) {
        return "null";
    }

    // 防止无限递归
    if (currentDepth > maxDepth) {
        return "<max depth reached>";
    }

    try {
        // 处理Java对象
        if (obj.$className) {
            // 特殊处理JSONObject
            if (obj.$className === "org.json.JSONObject") {
                return obj.toString();
            }

            // 处理字符串
            if (obj.$className === "java.lang.String") {
                return obj.toString();
            }

            // 获取类信息
            const clazz = obj.class;
            if (clazz.isPrimitive()) {
                return obj.toString();
            }

            let result = "{\n";
            const fields:any[] = clazz.getDeclaredFields();

            const MODIFIER_STATIC = 8;

            for (let i = 0; i < fields.length; i++) {
                const field = fields[i];
                const mod = field.getModifiers();
                if((mod & MODIFIER_STATIC) != 0){
                    continue;
                }

                try {
                    const fieldName = field.getName();
                    const fieldValue = obj[fieldName].value;

                    // 递归处理字段值
                    const fieldValueStr = object2string(fieldValue, maxDepth, currentDepth + 1);

                    if(fieldValueStr !== 'null'){
                        result += "  ".repeat(currentDepth + 1) + fieldName + ": " + fieldValueStr + "\n";
                    }
                } catch (fieldError) {
                    result += "  ".repeat(currentDepth + 1) + field + ": <access error>\n";
                }
            }

            result += "  ".repeat(currentDepth) + "}";
            return result;
        }

        // 处理JavaScript对象
        if (typeof obj === "object") {
            return JSON.stringify(obj);
        }

        // 处理基本类型
        return obj.toString();
    } catch (e) {
        return "<error: " + e + ">";
    }
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

        V2TIMManagerImpl.initSDK.overload("android.content.Context", "int", "com.tencent.imsdk.v2.V2TIMSDKConfig").implementation = function( context:Context, sdkAppID:number, V2TIMSDKConfig:object) {
            console.log("initSDK: " + sdkAppID);
            // hook initSDK
            return this.initSDK.call(this, context, sdkAppID,V2TIMSDKConfig);
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

function hookShuMei(){
    Java.perform(function() {
        //com.ishumei.sm_fraud.SmFraudPlugin#initSmSDK
        var SmFraudPlugin = Java.use("com.ishumei.sm_fraud.SmFraudPlugin");
        SmFraudPlugin.onMethodCall.implementation = function(methodCall:any, result:any) {

            let method = methodCall.method;
            let argvs = methodCall.arguments;
            // hook initSmSDK
            this.onMethodCall.call(this, methodCall, result)
            console.log("onMethodCall - methodCall.method: "
                + method
                + ",argvs:" + JSON.stringify(argvs)
                + ",result:" + JSON.stringify(result.sucess));
        };
    });
}
function hookRongIM(){
    Java.perform(function() {
        var RongIMClient = Java.use("io.rong.imlib.RongIMClient");

        RongIMClient.init.overload('android.content.Context', 'java.lang.String', 'boolean', 'java.lang.Boolean').implementation = function(context:any, rongkey:string, z10:boolean, bool:any) {
            console.log("init - rongkey: " + rongkey);
            // hook joinExistChatRoom
            return this.init.call(this, context, rongkey, z10,bool);
        };

        RongIMClient.joinChatRoom.implementation = function(chatRoomId:string, defMessageCount:number, listener:any) {
            console.log("joinChatRoom - chatRoomId: " + chatRoomId);
            // hook joinExistChatRoom
            return this.joinChatRoom.call(this, chatRoomId, defMessageCount, listener);
        };

        RongIMClient.joinExistChatRoom.implementation = function(chatRoomId:string, defMessageCount:number,listener:any) {
            console.log("joinExistChatRoom - chatRoomId: " + chatRoomId);
            // hook joinExistChatRoom
            return this.joinExistChatRoom.call(this, chatRoomId, defMessageCount, listener);
        };


    });
}

function hookNim(){
    Java.perform(function() {
        var NIMClient = Java.use("com.netease.nimlib.sdk.NIMClient");
        NIMClient.init.implementation = function(context:any, loginInfo:any, options:any){
            if(loginInfo){
                console.log("init - account: " + loginInfo.account + ",token:" + loginInfo.account);
            }
            console.log("init - appKey: " + options.appKey);
            return this.init.call(this, context, loginInfo, options);
        };

        NIMClient.config.implementation = function(context:any, loginInfo:any, options:any){
            if(loginInfo){
                console.log("init - account: " + loginInfo.account + ",token:" + loginInfo.account);
            }
            console.log("init - appKey: " + options.appKey);
            return this.config.call(this, context, loginInfo, options);
        };

        var AuthService = Java.use("com.netease.nimlib.sdk.auth.AuthService");

        AuthService.login.implementation = function(loginInfo:any){
            console.log("login - account: " + loginInfo.account + ",token:" + loginInfo.account);
            return this.login.call(this, loginInfo);
        };
    });
}