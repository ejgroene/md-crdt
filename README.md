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

* The Great Marriage of RDF and CRDT

It turns out that combining CRDT with RDF, we end up with some very neat conflict resolutions and a very straight forward implementation.

CRDT implementations often use 'multi-value' registers for dealing with conflicts. This is less optimal, because one can never be sure about the value of something: it might just be the integer 42, but it might also contain two integers: [42, 16] when there has been a conflict.  This makes programming the application hard. Also, the actractive idea of CRDTs are the promise to get rid of the dreaded conflict notifications in applications. This multi-value register still forces user to decide.

We only want users to decide if a conflict is in fact a high level conflict between human editors. One editor thinks a number is 42, while the other insists on it being 16. That is something a curator us used to and she can naturally solve it, if she at least knows who states what. She might trust one and distrust the other. RDF helps here, actually.

For starters, in RDF, both statements are equal and all tooling is prepared to work with them. There is really no problem with conflicting statements as they do not exists at the RDF level. They might exist at application level, but that is exactly where we want them. As far as the data is concerned, there is no conflict at all.  The result of this is that the mechanics of maintaining an RDF graph using a CRDT becomes easier and more powerful.

A completely different way of looking at this (from a distributed system perspective) is to say that RDF statements are unique and read-only. The statement (john age 42) is just as valid as (john age 16) and the latter is *not* a newer version of the former. It is just another statement. This means there cannot be a conflict in the data and as a result, RDF statements can be freely copied and distributed without any consistency problems, as can be done with any read-only data. This makes data shared *much* easier. Immensely easier.

 Instead of creating multi-value registers, we just branch. Each time there are two concurrent statements, we add a branch to the tree. And the good thing is that this is not a special case; it is just the natural way of dealing with RDF data. One of the branches may be erronous, be the editors have to decide by cutting that branch.

Cutting branches can be done based on the source of the statements, the particular agent who wrote it, the date it has been written if something entirely different. The point here is that all this information is present in de CRDT operation, but no longer in the multi-value register. The use of multi-value registers only allows editors to decide about the validity of the data by looking at the values itself. That would require editors to have detailed knowledge about all the facts, while there is no way to take provenance into account.
