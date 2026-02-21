module.exports = {
  // Configurações básicas
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  
  // JSX específico
  jsxSingleQuote: false,
  jsxBracketSameLine: false,
  
  // Quebras de linha
  endOfLine: 'lf',
  
  // Formatação de objetos
  bracketSpacing: true,
  
  // Arrow functions
  arrowParens: 'avoid',
  
  // Formatação de arrays
  bracketSameLine: false,
  
  // Configurações específicas por tipo de arquivo
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
        tabWidth: 2
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always'
      }
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    }
  ]
};