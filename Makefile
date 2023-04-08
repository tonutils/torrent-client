git-modules:
	git submodule update --remote --init --recursive

compile-storage:
	mkdir -p ton-build
	cd ton-build; CC=clang CXX=clang++ cmake -DCMAKE_BUILD_TYPE=Release ../ton; make storage-daemon -j8

build-mac:
	wails build -clean
	cp ton-build/storage/storage-daemon/storage-daemon build/bin/TON\ Torrent.app/Contents/MacOS/storage-daemon
	wget https://ton.org/global.config.json -P build/bin/TON\ Torrent.app/Contents/MacOS/

build-linux:
	wails build -clean
	cp ton-build/storage/storage-daemon/storage-daemon build/bin/storage-daemon
	wget https://ton.org/global.config.json -P build/bin/
	tar -czvf build/bin/ton-torrent.tar.gz -C build/bin .

build-windows:
	curl --create-dirs -O --output-dir build https://ton.org/global.config.json
	wails build -nsis