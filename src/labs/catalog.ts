import type { Locale } from "../i18n";
export const labCatalog = [
  [
    "pixels",
    "01",
    [
      "Pixel & tensor inspector",
      "Pixels et tenseurs",
      "فاحص البكسلات والموترات",
    ],
    [
      "Paint an input. Inspect its numbers.",
      "Dessinez et inspectez les nombres.",
      "ارسم المدخل وافحص أعداده.",
    ],
  ],
  [
    "neuron",
    "02",
    ["Neuron workbench", "Établi du neurone", "طاولة العصبون"],
    [
      "A weighted sum, completely exposed.",
      "Une somme pondérée transparente.",
      "مجموع موزون مكشوف بالكامل.",
    ],
  ],
  [
    "composition",
    "03",
    ["Function composition", "Composition de fonctions", "تركيب الدوال"],
    [
      "See why XOR needs nonlinearity.",
      "Découvrez la non-linéarité de XOR.",
      "شاهد لماذا تحتاج XOR اللاخطية.",
    ],
  ],
  [
    "convolution",
    "04",
    ["Convolution scanner", "Scanner de convolution", "ماسح الالتفاف"],
    [
      "Move a kernel. Follow every product.",
      "Déplacez le noyau, suivez les produits.",
      "حرّك النواة وتتبع كل حاصل ضرب.",
    ],
  ],
  [
    "pooling",
    "05",
    ["Pooling comparison", "Comparaison du pooling", "مقارنة التجميع"],
    [
      "What survives? What disappears?",
      "Que reste-t-il ? Que perd-on ?",
      "ما الذي يبقى وما الذي يختفي؟",
    ],
  ],
  [
    "flatten",
    "06",
    ["Flatten bridge", "Passerelle Flatten", "جسر التسطيح"],
    [
      "Map space to indices and connections.",
      "Reliez espace, indices et connexions.",
      "اربط المكان بالفهرس والوصلة.",
    ],
  ],
  [
    "loss",
    "07",
    ["Loss explorer", "Explorateur de perte", "مستكشف الخسارة"],
    [
      "Turn a mistake into a learning signal.",
      "Transformez l’erreur en signal.",
      "حوّل الخطأ إلى إشارة تعلم.",
    ],
  ],
  [
    "backprop",
    "08",
    [
      "Backpropagation microscope",
      "Microscope du gradient",
      "مجهر الانتشار العكسي",
    ],
    [
      "One weight. One gradient. One update.",
      "Un poids, un gradient, une mise à jour.",
      "وزن واحد وتدرج واحد وتحديث واحد.",
    ],
  ],
  [
    "training",
    "09",
    ["Training laboratory", "Laboratoire d’entraînement", "مختبر التدريب"],
    [
      "Train a real CNN in your browser.",
      "Entraînez un vrai CNN dans le navigateur.",
      "درّب CNN حقيقية في المتصفح.",
    ],
  ],
  [
    "transformations",
    "10",
    [
      "Transformation laboratory",
      "Laboratoire de transformations",
      "مختبر التحويلات",
    ],
    [
      "Shift, flip, rotate: compare results.",
      "Déplacez, retournez, tournez, comparez.",
      "أزح واعكس ودوّر وقارن النتائج.",
    ],
  ],
  [
    "tasks",
    "11",
    [
      "Classification ↔ regression",
      "Classification ↔ régression",
      "التصنيف ↔ الانحدار",
    ],
    [
      "Same backbone. Different questions.",
      "Même extracteur, autres questions.",
      "المستخرج نفسه وأسئلة مختلفة.",
    ],
  ],
  [
    "inference",
    "12",
    ["Inference walkthrough", "Parcours de prédiction", "رحلة الاستدلال"],
    [
      "A forward pass with frozen weights.",
      "Une propagation aux poids figés.",
      "مرور أمامي بأوزان ثابتة.",
    ],
  ],
] as const;
export const labInfo = (id: string, locale: Locale) => {
  const lab = labCatalog.find((l) => l[0] === id) || labCatalog[0],
    index = ["en", "fr", "ar"].indexOf(locale);
  return {
    id: lab[0],
    number: lab[1],
    title: lab[2][index],
    description: lab[3][index],
  };
};
