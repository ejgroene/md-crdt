# md-crdt
Metadata CRDT/ORDT

This will be a redo/wrapup of my work on using Conflict Free Replicated Datatypes for publishing metadata.

It will consist of two main parts:

1. an efficient way to represent and pack updates in a tool independent manner,
2. a specification of updates/operations with some demos.

The most important thing I need to address is the entanglement of everything with (online) tooling. Originally, I wanted to have the CRDT/ORDT completely independent of tooling. The idea is that data should not depend on tool chains, especially not online ones. Data should exists and be valid independently.

* Some observations

1. The ORDT implemented in Seecr Focus differs from traditional CRDTs in the way it maintains state. The state is in fact the sum of all operations. Only when rendering the operations are interpreted as to show the user the correct end result.

2. The state is actually a tree. Each operation points to a predecessor. Siblings are concurrent updates. This allows for pruning unwanted updates.

3. RDF is used as fundamental data representation only because:
  - every node has its own unique identifier, simplifying references between operation considerably,
  - it is so dead simple, complicated stuff can be build on top of it,
  - any formalisation, checking etc is done after processing CRDT operations.

4. Regardless of 3. we use Python in-memory data representation (plain old data, POD) to work with. Ultimately, one needs a concrete API to manipulate data, and there is nothing more straight forward and efficient than PODs. The mapping to RDF is done once we are finished.
