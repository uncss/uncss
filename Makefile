test: mocha
test-cov: istanbul

istanbul:
	istanbul cover ./node_modules/mocha/bin/_mocha --report lcovonly -- -R spec tests/*.js

coveralls:
	cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js && rm -rf ./coverage

mocha:
	node_modules/mocha/bin/_mocha tests/*.js --reporter spec
