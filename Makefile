REPORTER = dot

test:
	@./node_modules/.bin/mocha --reporter $(REPORTER)
	@./node_modules/.bin/jshint lib/*.js test/*.js

.PHONY: test