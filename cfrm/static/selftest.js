

import "chai"                               // pollute global namespace with 'chai'
const {expect} = chai       // chai is globally imported earlier


var indent = ""

export async function describe(message, body, fnt="font-weight: bold") {
  console.log("%c" + indent + message, fnt)
  indent += "  "
  try {
    const result = body(this)
    if (result instanceof Promise)
      await result
  } catch (err) {
    if (indent.length <= 2) 
      if (err instanceof chai.AssertionError) {
        const {message, actual, expected} = err
        console.error(message, {actual, expected})
      } else
        console.log(err)
    throw err
  } finally {
    indent = indent.slice(0, -2)
  }
}

export const it = (...args) => describe(...args, "font-style: italic")
describe.it = it



// Test execution order of given code below to be linear

await describe("selftest: synchronous and ordered tests", async () => {

  let trace = []

  await describe("describe test A", () => { trace.push("A") })

  trace.push("A-B")

  await describe("describe test B", async () => {
    trace.push("B1")
    await new Promise(resolve => setTimeout(resolve, 100))
    trace.push("B2")
  })

  trace.push("B-C")

  await describe("describe test C", () => { trace.push("C") })

  trace.push("C-D")

  await describe("describe test D", async () => {
    trace.push("D1")
    await new Promise(resolve => setTimeout(resolve, 50))
    trace.push("D2")
  })

  await describe("end result", () => {
    expect(trace).to.deep.equal([
      "A",
      "A-B",
      "B1",
      "B2",
      "B-C",
      "C",
      "C-D",
      "D1",
      "D2",
    ])
  })
})

