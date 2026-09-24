/**
 * Frida script to hook MD5 functions
 * Target: Java_com_video_signature-lib_signature-libUtil_getCMack
 */

console.log("[*] MD5 Hook Script Loaded");

// Hook MD5 constructor
var MD5Constructor = null;
var MD5toStr = null;
var getAppSignature = null;

var libname = "libsignature-lib.so";


function hook_md5(md5Addr: NativePointer){
    Interceptor.attach(md5Addr, {
        onEnter: function(args) {
            // console.log("参数:", hexdump(args[1]))
        },
        onLeave: function(retval) {
            console.log("返回值:", hexdump(retval))
        }
    })
}

Process.enumerateModules().forEach(module => {

    console.log("Module: " + module.name + ", Base Address: " + module.base)
    if(module.name == libname){
        var exports = module.enumerateExports();
        exports.forEach(function(exp) {
            if (exp.name.includes("_ZN3MD55toStrEv")) {
                console.log("[*] Found MD5 export: " + exp.name);
                MD5Constructor = exp.address;
                console.log("[+] MD5 Constructor found at: " + MD5Constructor);

                hook_md5(exp.address);
            }
        });
    }
});
console.log("[*] Script initialization complete");