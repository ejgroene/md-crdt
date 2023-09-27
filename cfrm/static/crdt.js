

import {rdf, rdf_formats, combinatorics, Readable} from "./libs-pack.mjs";
console.log("rdf", rdf)
console.log("rdf_formats", rdf_formats.serializers)

const JsonLdSerializer = rdf_formats.serializers.get('application/ld+json')
console.log("JsonLdSerializer", JsonLdSerializer)


async function materialize(operations) {
    let publish = []
    let retract = new Set()
    for (const op of operations) {
        if (op.operation == "retract") {
            retract.add(op.base)
        } else {
            publish.push(op)
        }
    }
    const graph = rdf.dataset()
    for (const op of publish) {
        const v = op.object
        if (!retract.has(op.base)) {
            graph.addAll([
                rdf.quad(
                    rdf.namedNode(op.subject),
                    rdf.namedNode(op.predicate),
                    typeof v === 'string' ? rdf.literal(v) : rdf.namedNode(v["@id"])
                )
            ])
        }
    }
    return graph
}

// parse JSON-LD to RDF using RDF-EXT
async function parse_jsonld(result) {
    const js = JSON.stringify(result);
    console.log("JS", js)
    const graph = rdf.dataset()
    const input = Readable.from([js])
    const output = rdf_formats.parsers.import('application/ld+json', input)
    console.log("OUTPUT", output)
    output.on('data', (quad) => {
        console.log("QUAD", quad)
    })
    for await (const quad of output) {
        console.log("QUAD", quad)
        graph.add(quad)
    }
    return graph
}


async function exec_test(js) {
    // for each case in js execute the test
    for (let i = 0; i < 1 /*js.length*/; i++) {
        let {operations, result, case: c} = js[i]
        console.log("TEST:", c, operations)
        let soll = await parse_jsonld(result)
        console.log("SOLL", soll)
        
        for(var p of new combinatorics.Permutation(operations)) {
            console.log("PERMUTATION:", p)
            const r = await materialize(p)
            test.eq(soll.toCanonical(), r.toCanonical())
        }
    }
} 

it('should just WORK', () => {
  fetch("./static/testdata.json")
    .then(response => response.json())
    .then(js => exec_test(js))
})





/* keep it for docs are very limited
    const outp = rdf_formats.serializers.import('application/ld+json', graph.toStream())
    console.log("OUTP", outp)
    let str = '';
    for await (const chunck of outp) {
        console.log("CHUNK", chunck)
        str += chunck
    }
*/
