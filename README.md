# md-crdt
Metadata CRDT

This will be a redo/wrapup off my work on using Conflic Free Replicated Datatypes for publishing metadata.

It will consist of two main parts:

1. a efficient way to represent and pack updates in a tool independent manner
2. a specification of updates and some demos

The most important thing I need to address is the entanglement of everything with (online) tooling. Orininally, I wanted to have the CRDT completely independent of tooling. The idea is that data should not depend on tool chains, especially not online tooling. Data should exists and be valid independently.
