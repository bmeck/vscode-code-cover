.PHONY: coverage

all:
	@mkdir -p out
	@babel lib\
		--out-dir out\
	 	--source-maps true
	@echo built

coverage:
	istanbul cover out/index.js

clean:
	rm -rf out/
