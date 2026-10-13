# Translation and editorial review

English, French and Modern Standard Arabic have complete UI resource objects, 36 MDX lessons each and 72 glossary entries each. Technical identifiers such as ReLU, Adam, shape tuples and Keras code stay canonical. Arabic prose uses the chosen mathematical vocabulary consistently: gradient = التدرج, bias = الانحياز, tensor = الموتر, recall = الاستدعاء, precision = الإحكام. The glossary pairs translations with English names.

Automated checks catch missing files, empty strings, invalid lesson IDs and missing sections. Browser checks verify the three language paths and LTR mathematical axes. These checks do not substitute for independent native-speaker editorial review; contributions improving idiom and pedagogy are welcome. Review the mathematical meaning rather than translating code tokens or reversing tensor axes.

For a new language: extend `Locale`, UI resources, metadata, localized MDX and a static glossary index. Preserve stable IDs. Search and URL routes should carry the locale; the experiment worker must remain language-independent.
