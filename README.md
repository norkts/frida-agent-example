### How to compile & load

```sh
$ sudo pip3 install frida==16.4.1
$ sudo pip3 intsall frida-tools==13.6.1
```

```sh
$ git clone https://github.com/oleavr/frida-agent-example.git
$ cd frida-agent-example/
$ npm install
$ frida -U -f com.example.android -l _agent.js
```

### Development workflow

To continuously recompile on change, keep this running in a terminal:

```sh
$ npm run watch
```

And use an editor like Visual Studio Code for code completion and instant
type-checking feedback.
