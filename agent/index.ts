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
hook_anti_bangbang();
// hook_android();
// hookRongIM();
// disablePinning();
// hookHawk();
// hook_tencent_imsdk();
// hook_agora();
// hookNim();
// hook_md5();
// hook_huanxin();
// hook_taqu();
// hook_pengran();
// hook_qinsi();

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
            console.log("Disabling SSL validation")
        },
        onLeave: function(retval)
        {
            console.log("Retval: " + retval)
            retval.replace(ptr(0x1));
        }
    });
}

function hook_android(){
    const Application = Java.use("android.app.Application");
    Application.attachBaseContext.implementation = function(context:any){
        console.log("attach -: " + object2string(context));
        const res = this.attach.call(this, context);
        hookNim();
        return res;
    };
}

function disablePinning(){
    // Change the offset on the line below with the binwalk result
    // If you are on 32 bit, add 1 to the offset to indicate it is a THUMB function: .add(0x1)
    // Otherwise, you will get 'Error: unable to intercept function at ......; please file a bug'
    const packagePcMap:{[key:string]:number} = {
        "com.lvpaopao.party": 0x6dbef4,
        "com.voiceparty.app": 0x6dbef4,
        "com.huwei.laiwanya":  0x5dc570,
        "voice.taoziplanet.com": 0x6DBEF4,
        "com.yuyin.youtingyuyin": 0x596870,
        "com.weekool.voice": 0xA8584C,
        "com.sound.wekool": 0xA8584C,
        "com.jixing.party": 0xA8584C,
        "com.boto.world": 0x6C4C20,
        "com.fxwl.tuyouda": 0x596870,
        "voice.ananplanet.com": 0x6dbef4,
        "com.jingjing.party": 0x6dbef4,
        "com.bumian.voice": 0x6dbef4,
        "com.yuyin.yunduanpaidui": 0x596870,
        "com.happy8.miyotribe":0x5fdf60,
        "com.yunxi.iuu":0x596870,
        "com.ruidafeng.youyouyuyin":0x6E85FC,
        "com.vioceinfuture.confession":0x726460
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

function hook_md5(){
    var addr = Module.findBaseAddress('libapp.so');
    if(addr == null){
        console.log("libapp.so not found")
        return;
    }
    var funcAddr = addr.add(0xd9fb01);
    Interceptor.attach(funcAddr, {
        onEnter: function(args) {
            console.log("参数:", hexdump(args[0]))
        },
        onLeave: function(retval) {
            console.log("返回值:", hexdump(retval))
        }
    })
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

        var GroupMananger = Java.use("com.hyphenate.chat.EMGroupManager");

        GroupMananger.joinGroup.implementation = function(groupId:string) {
            console.log("joinGroup - groupId: " + groupId);
            // hook joinGroup
            return this.joinGroup.call(this, groupId);
        };

        // var methodCallWrapper = Java.use("s3.w4");
        // methodCallWrapper.onMethodCall.implementation = function(methodCall:any, result:any) {
        //     const res = this.onMethodCall.call(this, methodCall, result);
        //     // console.log("onMethodCall - method: " + methodCall.method.value + ",result=" + object2string(result) + ", param:" + methodCall.arguments());
        //     return res;
        // }
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
            console.log("joinGroup - groupID: " + groupID + ",message:" + message);
            // hook joinGroup
            return this.joinGroup.call(this, groupID, message, callback);
        };

        V2TIMManagerImpl.createGroup.implementation = function( var1:string, var2:string,var3:string,callback:any) {
            console.log("createGroup - var1: " + var1 + ",var2:" + var2 + ",var3:" + var3);
            // hook joinGroup
            return this.createGroup.call(this, var1, var2, var3, callback);
        };

        // var ImManager = Java.use("cn.douyuu.im.core.ImManager");
        // ImManager.OooO0o.implementation = function( var1:string, var2:string,callback:any) {
        //     console.log("login - var1: " + var1 + ",var2:" + var2);
        //     // hook login
        //     return this.OooO0o.call(this, var1, var2,callback);
        // };

        // ImManager.autoLogin.implementation = function(var1:string,callback:any) {
        //     console.log("autoLogin:" + var1);
        //     // hook autoLogin
        //     return this.autoLogin.call(this, var1,callback);
        // };

        // ImManager.OooO.implementation = function( roomId:string,callback:any) {
        //     console.log("joinGroup - var1: " + roomId);
        //     // hook OooOo00
        //     return this.OooO.call(this, roomId, callback);
        // };

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

        RongIMClient.connect.overload('java.lang.String', 'int', 'io.rong.imlib.RongIMClient$ConnectCallback').implementation = function(token:string, timeLimit:number, callback:any) {
            console.log("connect - token: " + token);
            // hook joinExistChatRoom
            return this.connect.call(this, token, timeLimit, callback);
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
                console.log("init - account: " + loginInfo.account + ",token:" + loginInfo.token);
            }
            console.log("init - appKey: " + options.appKey);
            return this.init.call(this, context, loginInfo, options);
        };

        NIMClient.config.implementation = function(context:any, loginInfo:any, options:any){
            if(loginInfo){
                console.log("init - account: " + loginInfo.account + ",token:" + loginInfo.token);
            }
            console.log("init - appKey: " + options.appKey);
            return this.config.call(this, context, loginInfo, options);
        };

        var AuthService = Java.use("com.netease.nimlib.d.f.a");

        AuthService.login.implementation = function(loginInfo:any){
            console.log("login -: " + object2string(loginInfo));
            return this.login.call(this, loginInfo);
        };

        var ChatRoomService = Java.use("com.netease.nimlib.chatroom.e.a");

        ChatRoomService.enterChatRoomEx.implementation = function (data:any, retry:any){
            console.log("enterChatRoomEx -: " + object2string(data));
            return this.enterChatRoomEx.call(this, data, retry);
        }

        ChatRoomService.enterChatRoom.implementation = function (data:any){
            console.log("enterChatRoomEx -: " + object2string(data));
            return this.enterChatRoom.call(this, data);
        }
    });
}

function hook_taqu(){
    hook_anti_nesec();

    Java.perform(function() {
        var AppSleepBindPhoneDialog = Java.use("com.xingjiabi.shengsheng.widget.AppSleepBindPhoneDialog");
        AppSleepBindPhoneDialog.show.implementation = function (){
            console.log("show,return");
            return;
        }
    });
}

function hook_dlopen_for_gaobai() {
    var dlopen = Module.findExportByName(null, "dlopen");

    if(dlopen == null){
        return;
    }

    var android_dlopen_ext = Module.findExportByName(null, "android_dlopen_ext");

    if(android_dlopen_ext == null){
        return;
    }

    Interceptor.attach(dlopen, {
        onEnter: function(args) {
            var path_ptr = args[0];
            var path = path_ptr.readCString();
            console.log("[dlopen:]", path);
        },
        onLeave: function(retval) {}
    });
    Interceptor.attach(android_dlopen_ext, {
        onEnter: function(args) {
            var path_ptr = args[0];
            var path = path_ptr.readCString();
            console.log("[dlopen_ext:]", path);
        },
        onLeave: function(retval) {}
    });
}

function hook_anti_nesec() {
    const targetLibrary = "libnesec.so";
    var baseAddress = null;
    var androidDlopenExtPtr = Module.findExportByName(null, "android_dlopen_ext");
    if(androidDlopenExtPtr == null){
        console.log("android_dlopen_ext not found");
        return;
    }
    Interceptor.attach(androidDlopenExtPtr, {
        onEnter: function (args) {
            var libraryPath = args[0].readCString();
            if (libraryPath && libraryPath.includes(targetLibrary)) {
                console.log("[+] Loading " + targetLibrary + " from: " + libraryPath);
                this.isTargetLib = true;
            }
        },
        onLeave: function (retval) {
            if (this.isTargetLib) {
                console.log("[+] " + targetLibrary + " loaded, handle: " + retval);
                baseAddress = Module.findBaseAddress(targetLibrary);
                console.log("[+] Base address of " + targetLibrary + " is: " + baseAddress);
                if(baseAddress != null){
                    // 在这里执行我们的核心绕过逻辑
                    bypass_anti_nesec_debug(baseAddress);
                }
                this.isTargetLib = false;
            }
        }
    });
}

function bypass_anti_nesec_debug(baseAddress: NativePointerValue) {

    var pthread_create = Module.findExportByName("libc.so", "pthread_create");
    if(pthread_create == null){
        console.log("[-] Failed to find pthread_create")
        return;
    }
    Interceptor.attach(pthread_create, {
        onEnter: function (args) {
            var thread_start_routine = args[2];
            var offset = thread_start_routine.sub(baseAddress);
            // console.log("[*] New thread created with start routine at: " + thread_start_routine);
            // console.log("    -> Offset from libnesec.so base: " + offset);

            var so_name = Process.findModuleByAddress(args[2])!.name;
            if (so_name.indexOf("libnesec") != -1) {
                try {
                    Interceptor.replace(args[2], new NativeCallback(function() {
                        console.log('replace success');
                        return null;
                    }, 'void', ["void"]));
                } catch (e) {}
            }
        },
        onLeave: function (retval) {
        }
    });
}

function hook_anti_bangbang() {
    hook_pthread_create();
}

function hook_dlopen() {
    var android_dlopen_ext = Module.findExportByName(null, "android_dlopen_ext");
    if(android_dlopen_ext == null){
        console.log("[-] android_dlopen_ext not found");
        return;
    }
    Interceptor.attach(android_dlopen_ext, {
        onEnter: function (args) {
            var path_ptr = args[0];
            var path = path_ptr.readCString();
            console.log("[android_dlopen_ext -> enter", path);
            if(path == null){
                console.log("[-] path is null");
                return;
            }
            if (args[0].readCString() != null && path.toLowerCase().indexOf("libsecshell.so") >= 0) {
                // hook_call_constructors()
                hook_pthread_create()
            }
        },
        onLeave: function (retval) {
        }
    });
}

function hook_pthread_create(){
    Interceptor.attach(Module.findExportByName(null, 'clone')!, {
        onEnter: function (args) {
            // 获取线程函数地址
            var thread_func = args[0];

            // 尝试获取线程函数所在模块
            var module = Process.findModuleByAddress(thread_func);
            if (module) {
                console.log('Thread function is located in module: ' + module.name);
            } else {

            }

            // 打印调用栈
            console.log('Backtrace:');
            console.log(Thread.backtrace(this.context, Backtracer.ACCURATE)
                .map(DebugSymbol.fromAddress).join('\n'));
        },
        onLeave: function (retval) {
            // 可以在这里修改 clone 的返回值（如需要）
        }
    });
}

function patch_func_nop(addr:NativePointer) {
    Memory.patchCode(addr, 8, function (code) {
        code.writeByteArray([0xE0, 0x03, 0x00, 0xAA]);
        code.writeByteArray([0xC0, 0x03, 0x5F, 0xD6]);
        console.log("patch code at " + addr)
    });
}
function bypass_anti_bangbang_debug() {
// 绕过梆梆对 Frida 特征的内存扫描
    setImmediate(function() {
        console.log("[*] 开始隐藏 Frida 特征...");

        // 目标特征字符串（梆梆常检测的 Frida 相关特征）
        var fridaFeatures = [
            "frida", "Frida", "FRIDA",
            "frida-agent", "frida rpc",
            "27042", "27043" // Frida 默认端口
        ];

        // 1. Hook strstr（C 层字符串查找函数）
        try {
            var strstr = Module.findExportByName("libc.so", "strstr");
            if (strstr) {
                Interceptor.attach(strstr, {
                    onEnter: function(args) {
                        this.haystack = args[0].readCString(); // 被查找的字符串（内存数据）
                        this.needle = args[1].readCString();   // 要查找的目标字符串（特征）
                    },
                    onLeave: function(retval) {
                        // 若检测到梆梆在查找 Frida 特征，强制返回 NULL（未找到）
                        if (fridaFeatures.includes(this.needle)) {
                            console.log(`[+] 拦截特征扫描：strstr("${this.haystack}", "${this.needle}")`);
                            retval.replace(NULL);
                        }
                    }
                });
            }
        } catch (e) {
            console.log("[-] strstr Hook 失败：", e);
        }

        // 2. Hook memmem（内存块查找函数，更精准的特征扫描）
        try {
            var memmem = Module.findExportByName("libc.so", "memmem");
            if (memmem) {
                Interceptor.attach(memmem, {
                    onEnter: function(args) {
                        this.needleLen = args[3].toInt32();
                        // 读取要查找的特征数据（最多读取 32 字节，避免性能损耗）
                        this.needle = args[2].readByteArray(Math.min(this.needleLen, 32));
                    },
                    onLeave: function(retval) {
                        // 检测特征数据是否包含 Frida 相关字符串
                        if (this.needle) {
                            var needleStr = new TextDecoder().decode(this.needle).toLowerCase();
                            if (fridaFeatures.some(f => needleStr.includes(f.toLowerCase()))) {
                                console.log(`[+] 拦截内存特征扫描：memmem(..., "${needleStr}")`);
                                retval.replace(NULL);
                            }
                        }
                    }
                });
            }
        } catch (e) {
            console.log("[-] memmem Hook 失败：", e);
        }

        // 3. 隐藏 Frida 进程名（若 Frida-server 未改名，补充此 Hook）
        try {
            var getpid = Module.findExportByName("libc.so", "getpid");
            var getppid = Module.findExportByName("libc.so", "getppid");
            var fridaPid = Process.id; // Frida 进程 PID
            if (getpid) {
                Interceptor.attach(getpid, {
                    onLeave: function(retval) {
                        // 若当前进程是 Frida，返回宿主 APP 的 PID（伪装成 APP 进程）
                        if (Process.id === fridaPid) {
                            retval.replace(new NativePointer(Process.enumerateThreads()[0].id));
                        }
                    }
                });
            }
        } catch (e) {
            console.log("[-] 隐藏 Frida PID 失败：", e);
        }
    });
}


function hook_agora() {
    Java.perform(function () {
        var RtmClient = Java.use("io.agora.rtm.RtmClient");
        RtmClient.createInstance.implementation = function (context: any, appId: string, listener: any) {
            console.log("createInstance - appId: " + appId);
            // hook createInstance
            return this.createInstance.call(this, context, appId, listener);
        };

        RtmClient.login.implementation = function (rtmToken: string, userId: any, listener: any) {
            console.log("login - rtmToken: " + rtmToken + ",userId:" + userId);
            // hook login
            return this.login.call(this, rtmToken, userId, listener);
        };

        RtmClient.createChannel.implementation = function (channelId: string, listener: any) {
            console.log("login - rtmToken: " + channelId);
            // hook login
            return this.login.call(this, channelId, listener);
        };
    });
}

function  hook_vpn(){
    const NetworkUtils = Java.use("com.qiyu.xchat_android_library.utils.NetworkUtils");
    NetworkUtils.jtjsjtr.implementation = function (){
        console.log("NetworkUtils.isVpn");
        return false;
    }
}

function hook_pengran(){
    Java.perform(function () {
        var MD5Utils = Java.use("com.duoduosdk.utils.codec.MD5Utils");
        MD5Utils.getMD5String.overload("java.lang.String").implementation = function (str: string){
            console.log("MD5Utils.getMD5String - str: " + str);
            return this.getMD5String.call(this,str);
        }
    });
}

function hook_qinsi(){
    Java.perform(function () {
        var DataUtils = Java.use("com.shenzhilingyu.buding.utils.DataUtils");
        DataUtils.encryptByPublicKeyForSpilt.overload("java.lang.String").implementation = function (str: string){
            console.log("DataUtils.encryptByPublicKeyForSpilt - str: " + str);
            return this.encryptByPublicKeyForSpilt.call(this,str);
        }
    });
}