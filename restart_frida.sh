adb  -s 192.168.0.150:5555  shell su -c "killall libnorkts.so; sleep 0.5"
echo "kill frida success"
adb  -s 192.168.0.150:5555  shell su -c "nohup /data/local/tmp/libnorkts.so >/data/local/tmp/frida.log 2>&1 &"
echo "start frida success"