
import "chai"           // pollute global namespace with 'chai'
const {expect} = chai


/**
* Returns a promise that resolves after ms milliseconds.
* @param {number} ms - number of milliseconds to sleep
* @returns {Promise}
*/
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}


/**
* Runs a piece of code with console.log and console.error intercepted.
* The intercepted messages are passed to body.
* Messages to console.log are propagated to the original,
* messages to console.error are not.
* @param {Function} body - body(log, err) is called with two arrays of messages
*                          logged to console.log and console.error.
*/
export function with_console_interception(body) {
  const config = [
    {name: "log", original: console.log, messages: [], propagate: true},
    {name: "error", original: console.error, messages: [], propagate: false}
  ]
  try {
    for (const {name, original, messages, propagate} of config)
      console[name] = (...a) => {
        messages.push(a)
        if (propagate)
          original.call(console, ...a)
      }
    body(...config.map(c => c.messages))
  } finally {
    for (const {name, original} of config)
      console[name] = original
  }
}

/**
* Runs tests (body) with given message and subtests.
* @param {string} message - message to log
* @param {Function} body - body(subtester) is called with a function to run subtests.
* @returns {Function} - without body, returns a function to run tests.
* The returned function returns a promise that resolves when all subtests are done.
* Each test can be async and waited for with await, or not.
  Typical usage:
    const test = Tester("magic library")
    test("magic", sub => {
      sub("magic works", subsub => {
        expect(magic(1)).to.equal(2)
      })
    })
  See examples below.
*/
export function Tester(message, body, indent="") {
  if (message)
    console.log(indent + (indent ? '↳ ' : '') + message)
  const bodies = []
  function run(message, body) {
    const b = Tester(message, body, indent + "  ")
    bodies.push(b)
    return b
  }
  run.then = (...a) => { Promise.allSettled(bodies).then(...a) }
  if (body) {
    if (body.length == 0)
      console.warn("Body should accept one argument: the subtester.")
    try {
      return body(run)
    } catch (e) {
      if (indent.length > 2) // propagate exception to top level
        throw e
      const {message, actual, expected} = e
      console.error(message, actual || expected ? {actual, expected} : e)
      throw 'stop on first failure'
    }
  }
  return run
}


console.assert(Tester instanceof Function, Tester)

let selftest

// bootstrap selftest using console.assert
with_console_interception(log => {
  function assert_invariants(t) {
    console.assert(t instanceof Function, t)
    console.assert(t.then instanceof Function, t.then)
    console.assert(Promise.resolve(t) instanceof Promise, t)
  }
  selftest = Tester("SELFTEST")
  assert_invariants(selftest)
  console.assert(log[0] == "SELFTEST", log)
  let subtest = selftest() // anonymous subtest
  assert_invariants(subtest)
  console.assert(log[1] == undefined, log)

  let test1 = subtest("test1")
  assert_invariants(test1)
  console.assert(log[1] == "    ↳ test1", log)
})


with_console_interception(log => {
  try {
    selftest("succeeding test", _ => {
      "no error"
    })
    console.assert(log[0] == "  ↳ succeeding test", log)
  } catch (e) {
    console.assert(false, "succeeding test failed", e)
  }
})


with_console_interception((log, err) => {
  try {
    selftest("failing test", sub => {
      sub("next error log is expected", _ => {
        throw new Error("expected failure")
      })
    })
  } catch (e) {
    console.assert(log[0] == "  ↳ failing test", log)
    console.assert(log[1] == "    ↳ next error log is expected", log)
    console.assert(err[0][0] == "expected failure", err)
    console.assert("stop on first failure", e.message)
  }
})
   

let trace = []
selftest("all synchronous test", test => {
  selftest("one subtest", _ => {
    trace.push("one")
  })
  selftest("two subtest", _ => {
    trace.push("two")
  })
  selftest("result", _ => {
    expect(trace).to.deep.equal(["one", "two"])
    trace.push("result")
  })
})
expect(trace).to.deep.equal(["one", "two", "result"])


trace = []
await selftest("an asynchronous test", async test => {
  await sleep(1)
  trace.push("one")
  expect(trace).to.deep.equal(["one"])
})


trace = []
selftest("three parallel subtests", async subtest => {
  subtest("test A", async _ => {
    trace.push("A0")
    await sleep(20)
    trace.push("A1")
  })
  subtest("test B", async subsubtest => {
    subsubtest("test C", async _ => {
      trace.push("C0")
      await sleep(14)
      trace.push("C1")
    })
    trace.push("B0")
    await sleep(3)
    trace.push("B1")
  })
  await subtest
  expect(trace).to.deep.equal(["A0", "C0", "B0", "B1", "C1", "A1"])
})

await selftest
expect(trace).to.deep.equal(["A0", "C0", "B0", "B1", "C1", "A1"])


trace = []
const toptest = Tester("TOPTEST")
toptest("top", subtest => {
  trace.push("top0")
  subtest("sub", subtest => {
    trace.push("sub0")
    subtest("subsub", subtest => {
      trace.push("subsub")
    })
    trace.push("sub1")
  })
  trace.push("top1")
})
expect(trace).to.deep.equal(["top0", "sub0", "subsub", "sub1", "top1"])


trace = []
const asynctest = Tester("TOPTEST")
await asynctest("top", async subtest => {
  await sleep(1)
  trace.push("top0")
  await sleep(2)
  await subtest("sub", async subsubtest => {
    await sleep(3)
    trace.push("sub0")
    await sleep(4)
    await subsubtest("subsub", async subsubtest => {
      await sleep(5)
      trace.push("subsub")
      await sleep(6)
    })
    await sleep(7)
    trace.push("sub1")
    await sleep(8)
  })
  await sleep(9)
  trace.push("top1")
  await sleep(3)
})
expect(trace).to.deep.equal(["top0", "sub0", "subsub", "sub1", "top1"])

