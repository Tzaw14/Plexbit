function formatearUniversal(texto, idioma = 'es') {
  if (!texto) return '';

  idioma = idioma.toLowerCase().substring(0, 2);
  texto = texto.replace(/\s{2,}/g, ' ').replace(/\n/g, ' ');

  const patronesPorIdioma = {
    // Spanish patterns
    es: [
      { title: '## Introducción', regex: /(?:hoy\s+vas\s+a\s+aprender|en\s+este\s+video|vamos\s+a\s+ver|bienvenidos|en\s+esta\s+clase)/i },
      { title: '## ¿Para qué sirve esto?', regex: /(?:sirve\s+para|utilidad\s+de|objetivo\s+principal)/i },
      { title: '## Conceptos Básicos', regex: /(?:conceptos\s+básicos|lo\s+primero\s+que\s+debes\s+saber)/i },
      { title: '### Variables', regex: /(?:variables|espacios\s+de\s+memoria)/i },
      { title: '### Funciones', regex: /(?:funciones|bloques\s+de\s+código)/i },
      { title: '### Condicionales', regex: /(?:condicionales|if|else|casos\s+que\s+depende)/i },
      { title: '### Ciclos', regex: /(?:ciclos|bucles|loops|repeticiones)/i },
      { title: '## Contexto histórico', regex: /(?:época\s+de|siglo\s+|año\s+\d{3,4})/i },
      { title: '## Personajes importantes', regex: /(?:personajes\s+clave|figuras\s+importantes|protagonistas)/i },
      { title: '## Datos curiosos', regex: /(?:sabías\s+que|dato\s+curioso|interesante\s+ver)/i },
      { title: '## Consecuencias', regex: /(?:consecuencias|efectos\s+de|impacto\s+en)/i },
      { title: '## Explicación científica', regex: /(?:científicos\s+han\s+descubierto|el\s+fenómeno\s+se\s+explica|ley\s+de\s+)/i },
      { title: '## Experimento', regex: /(?:experimento|probar\s+si|resultados\s+del\s+test)/i },
      { title: '## Recomendaciones', regex: /(?:te\s+recomiendo|lo\s+mejor\s+es|consejo\s+final)/i },
      { title: '## Conclusión', regex: /(?:en\s+resumen|conclusión|ya\s+sabes|hemos\s+aprendido)/i }
    ],
    // English patterns
    en: [
      { title: '## Introduction', regex: /(?:today\s+you'll\s+learn|in\s+this\s+video|we're\s+going\s+to\s+see|welcome|in\s+this\s+class)/i },
      { title: '## What is this used for?', regex: /(?:it's\s+used\s+for|utility\s+of|main\s+objective|purpose\s+of)/i },
      { title: '## Basic Concepts', regex: /(?:basic\s+concepts|first\s+thing\s+you\s+need\s+to\s+know|fundamental\s+principles)/i },
      { title: '### Variables', regex: /(?:variables|memory\s+spaces|storing\s+data)/i },
      { title: '### Functions', regex: /(?:functions|code\s+blocks|reusable\s+code)/i },
      { title: '### Conditionals', regex: /(?:conditionals|if\s+statements|else\s+blocks|depending\s+on\s+cases)/i },
      { title: '### Loops', regex: /(?:loops|iterations|repeating\s+code|cycle\s+through)/i },
      { title: '## Historical Context', regex: /(?:era\s+of|century|year\s+\d{3,4}|historical\s+period)/i },
      { title: '## Important Characters', regex: /(?:key\s+characters|important\s+figures|protagonists|main\s+people)/i },
      { title: '## Fun Facts', regex: /(?:did\s+you\s+know|fun\s+fact|interesting\s+to\s+note|curiously)/i },
      { title: '## Consequences', regex: /(?:consequences|effects\s+of|impact\s+on|resulted\s+in)/i },
      { title: '## Scientific Explanation', regex: /(?:scientists\s+have\s+discovered|the\s+phenomenon\s+is\s+explained|law\s+of|research\s+shows)/i },
      { title: '## Experiment', regex: /(?:experiment|testing\s+if|test\s+results|we\s+tested)/i },
      { title: '## Recommendations', regex: /(?:I\s+recommend|the\s+best\s+is|final\s+advice|you\s+should)/i },
      { title: '## Conclusion', regex: /(?:in\s+summary|conclusion|now\s+you\s+know|we've\s+learned|to\s+sum\s+up)/i }
    ]
  };

  const patrones = idioma.startsWith('en') ? patronesPorIdioma['en'] : patronesPorIdioma['es'];

  for (const patron of patrones) {
    const titulo = patron.title;
    texto = texto.replace(patron.regex, match => `\n\n${titulo.toUpperCase()}\n${match}`);
  }

  return texto.trim();
}

module.exports = { 
  formatearUniversal
};