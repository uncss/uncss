test: mocha
test-cov: istanbul

istanbul:
	istanbul cover _mocha -- -R spec tests/*.js

coveralls:
	cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js

mocha:
	node_modules/mocha/bin/_mocha tests/*.js --reporter spec
