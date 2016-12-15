BABEL=node_modules/.bin/babel
all:
	npm install
	@mkdir -p out
	@$(BABEL) lib\
		--optional runtime\
		--out-dir out\
	 	--source-maps true
	@echo built

watch:
	watch-run -i -p "lib/**.js" -- make all

clean:
	rm -rf out/
