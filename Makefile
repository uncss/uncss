test: mocha
test-cov: coveralls

coveralls:
	istanbul cover ./node_modules/mocha/bin/_mocha --report lcovonly -- -R spec tests/*.js && cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js && rm -rf ./coverage

mocha:
	node_modules/mocha/bin/_mocha tests/*.js --reporter spec
