

import "chai"                               // pollute global namespace with 'chai'
const {expect} = chai                       // chai is globally imported earlier

chai.config.includeStack = false
chai.config.showDiff = false


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}


function with_console_interception(body) {
  const l = console.log
  const e = console.error
  try {
    let log = []
    console.log = (...a) => {
      log.push(a)
      l.call(console, ...a)
    }
    let err = []
    console.error = (...a) => {
      err.push(a)
      e.call(console, ...a)
    }
    body(log, err)
  } finally {
    console.log = l
  }
}


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
  if (body)
    try {
      return body(run)
    } catch (e) {
      if (indent.length > 2) // propagate exception to top level
        throw e
      const {message, actual, expected} = e
      console.error(message, actual || expected ? {actual, expected} : e)
      throw 'stop on first failure'
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

  //selftest("test2", test2 => {
  //  expect(2).to.equal(1)
  //})
})


with_console_interception(log => {
  try {
    selftest("succeeding test", () => {
      expect(1).to.equal(1)
    })
    console.assert(log[0] == "  ↳ succeeding test", log)
  } catch (e) {
    console.assert(false, "succeeding test failed", e)
  }
})


with_console_interception((log, err) => {
  try {
    selftest("failing test", sub => {
      sub("subtest", () => {
        expect(1).to.equal(2)
      })
    })
  } catch (e) {
    console.assert(log[0] == "  ↳ failing test", log)
    console.assert(log[1] == "    ↳ subtest", log)
    console.assert(err[0][0] == "expected 1 to equal 2", err)
    //console.assert(err.length == 1, err)
    console.assert("stop on first failure", e.message)
  }
})
   

let trace = []
selftest("all synchronous test", test => {
  selftest("one subtest", () => {
    trace.push("one")
  })
  selftest("two subtest", () => {
    trace.push("two")
  })
  selftest("result", () => {
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
  subtest("test A", async () => {
    trace.push("A0")
    await sleep(20)
    trace.push("A1")
  })
  subtest("test B", async subsubtest => {
    subsubtest("test C", async () => {
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

