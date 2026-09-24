function hook_webview(classloader) {
    var WebViewClient = Java.use('com.tencent.smtt.sdk.WebViewClient');

    WebViewClient.onReceivedSslError.implementation = function (webview, handler, error) {
        console.log("onReceivedSslError: tencent.WebViewClient ignore");
        // handler.proceed();
    };
}

Java.perform(function () {
    hook_webview();

    var HttpRequest = Java.use('com.xicankdy.app.http.HttpRequest');
    console.log("load tencent.HttpRequest:" +HttpRequest)
    HttpRequest.isProxyExists.implementation = function () {
        console.log("isProxyExists: tencent.HttpRequest ignore");
        return false;
    };
});

