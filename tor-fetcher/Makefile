.PHONY:
all: install
	make -C external/tls-socket-wasm
	make -C external/ceba.js
	node_modules/.bin/webpack

.PHONY:
clean:
	make clean -C external/ceba.js
	make clean -C external/tls-socket-wasm

.PHONY:
install: node_modules

node_modules: package.json
	npm install
	touch node_modules
