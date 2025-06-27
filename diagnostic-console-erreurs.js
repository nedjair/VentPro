#!/usr/bin/env node

/**
 * Diagnostic des erreurs console
 * Aide à identifier les problèmes JavaScript dans l'application
 */

console.log('🔍 DIAGNOSTIC DES ERREURS CONSOLE\n');

console.log('📋 SCRIPT À EXÉCUTER DANS LA CONSOLE DU NAVIGATEUR:\n');

const diagnosticScript = `
// === DIAGNOSTIC COMPLET DES BOUTONS ===
console.clear();
console.log('🔧 === DÉBUT DU DIAGNOSTIC COMPLET ===');

// 1. Vérifier React
console.log('\\n1️⃣ VÉRIFICATION DE REACT:');
if (typeof React !== 'undefined') {
  console.log('✅ React est disponible:', React.version || 'version inconnue');
} else {
  console.log('❌ React n\\'est PAS disponible');
}

// 2. Vérifier Next.js
console.log('\\n2️⃣ VÉRIFICATION DE NEXT.JS:');
if (typeof window !== 'undefined' && window.next) {
  console.log('✅ Next.js détecté');
} else {
  console.log('⚠️  Next.js non détecté (normal en mode dev)');
}

// 3. Vérifier les erreurs JavaScript
console.log('\\n3️⃣ VÉRIFICATION DES ERREURS:');
const originalError = console.error;
let errorCount = 0;
console.error = function(...args) {
  errorCount++;
  console.log(\`❌ ERREUR \${errorCount}:\`, ...args);
  originalError.apply(console, args);
};

// 4. Analyser les boutons
console.log('\\n4️⃣ ANALYSE DES BOUTONS:');
const buttons = document.querySelectorAll('button');
console.log(\`📊 Nombre total de boutons: \${buttons.length}\`);

if (buttons.length === 0) {
  console.log('❌ AUCUN BOUTON TROUVÉ - Problème de rendu');
} else {
  let workingButtons = 0;
  let brokenButtons = 0;
  
  buttons.forEach((button, index) => {
    const text = button.textContent?.trim() || 'Sans texte';
    const hasOnClick = button.onclick !== null;
    const hasDataOnClick = button.hasAttribute('data-onclick');
    
    // Vérifier les event listeners React
    const reactProps = Object.keys(button).find(key => key.startsWith('__reactProps'));
    const hasReactEvents = reactProps && button[reactProps]?.onClick;
    
    if (hasOnClick || hasReactEvents || hasDataOnClick) {
      workingButtons++;
      console.log(\`✅ Bouton \${index + 1}: "\${text}" - Gestionnaire détecté\`);
    } else {
      brokenButtons++;
      console.log(\`❌ Bouton \${index + 1}: "\${text}" - AUCUN gestionnaire\`);
    }
  });
  
  console.log(\`\\n📊 RÉSUMÉ BOUTONS:\`);
  console.log(\`   ✅ Fonctionnels: \${workingButtons}\`);
  console.log(\`   ❌ Cassés: \${brokenButtons}\`);
  console.log(\`   📊 Total: \${buttons.length}\`);
}

// 5. Test de clic programmatique
console.log('\\n5️⃣ TEST DE CLIC PROGRAMMATIQUE:');
if (buttons.length > 0) {
  try {
    const testButton = buttons[0];
    console.log(\`🧪 Test sur: "\${testButton.textContent?.trim()}"\`);
    
    // Simuler un clic
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    testButton.dispatchEvent(clickEvent);
    console.log('✅ Clic programmatique envoyé');
  } catch (error) {
    console.log('❌ Erreur lors du clic programmatique:', error);
  }
}

// 6. Vérifier les composants React
console.log('\\n6️⃣ VÉRIFICATION DES COMPOSANTS REACT:');
const reactRoots = document.querySelectorAll('[data-reactroot], #__next');
if (reactRoots.length > 0) {
  console.log(\`✅ \${reactRoots.length} racine(s) React trouvée(s)\`);
} else {
  console.log('❌ Aucune racine React trouvée');
}

// 7. Vérifier les erreurs de hydratation
console.log('\\n7️⃣ VÉRIFICATION DE L\\'HYDRATATION:');
const hydrationErrors = document.querySelectorAll('[data-reactroot] *').length;
console.log(\`📊 Éléments dans l'arbre React: \${hydrationErrors}\`);

// 8. Vérifier les modules ES6
console.log('\\n8️⃣ VÉRIFICATION DES MODULES:');
if (typeof window !== 'undefined' && window.webpackChunkName) {
  console.log('✅ Webpack chunks détectés');
} else {
  console.log('⚠️  Webpack chunks non détectés');
}

// 9. Informations sur la page actuelle
console.log('\\n9️⃣ INFORMATIONS PAGE:');
console.log(\`📍 URL: \${window.location.href}\`);
console.log(\`📄 Titre: \${document.title}\`);
console.log(\`🔗 Pathname: \${window.location.pathname}\`);

// 10. Résumé final
console.log('\\n🎯 === RÉSUMÉ DU DIAGNOSTIC ===');
console.log(\`📊 Boutons analysés: \${buttons.length}\`);
console.log(\`❌ Erreurs détectées: \${errorCount}\`);
console.log(\`📍 Page: \${window.location.pathname}\`);

if (buttons.length === 0) {
  console.log('🚨 PROBLÈME CRITIQUE: Aucun bouton rendu');
} else if (workingButtons === 0) {
  console.log('🚨 PROBLÈME CRITIQUE: Aucun bouton fonctionnel');
} else if (workingButtons < buttons.length) {
  console.log('⚠️  PROBLÈME PARTIEL: Certains boutons non fonctionnels');
} else {
  console.log('✅ TOUS LES BOUTONS SEMBLENT FONCTIONNELS');
}

console.log('\\n🔧 === FIN DU DIAGNOSTIC ===');
`;

console.log('```javascript');
console.log(diagnosticScript);
console.log('```');

console.log('\n📋 INSTRUCTIONS:');
console.log('1. Ouvrir http://localhost:3003/clients');
console.log('2. Ouvrir les outils de développement (F12)');
console.log('3. Aller dans l\'onglet Console');
console.log('4. Copier-coller le script ci-dessus');
console.log('5. Appuyer sur Entrée');
console.log('6. Analyser les résultats');

console.log('\n🎯 CE QUE LE SCRIPT VA RÉVÉLER:');
console.log('- Si React est chargé correctement');
console.log('- Combien de boutons sont détectés');
console.log('- Quels boutons ont des gestionnaires d\'événements');
console.log('- S\'il y a des erreurs JavaScript');
console.log('- Si les composants React sont montés');

console.log('\n📊 INTERPRÉTATION DES RÉSULTATS:');
console.log('✅ Si "TOUS LES BOUTONS SEMBLENT FONCTIONNELS" → Problème ailleurs');
console.log('❌ Si "Aucun bouton fonctionnel" → Problème React/Next.js');
console.log('⚠️  Si "Certains boutons non fonctionnels" → Problème spécifique');
console.log('🚨 Si "Aucun bouton rendu" → Problème de compilation/rendu');

console.log('\n🔍 AUTRES VÉRIFICATIONS À FAIRE:');
console.log('1. Vérifier les erreurs dans l\'onglet Console');
console.log('2. Vérifier les requêtes échouées dans l\'onglet Network');
console.log('3. Vérifier les warnings React dans la console');
console.log('4. Essayer de rafraîchir la page (Ctrl+F5)');
console.log('5. Essayer en navigation privée');

console.log('\n💡 SOLUTIONS POSSIBLES:');
console.log('- Redémarrer le serveur Next.js');
console.log('- Vider le cache du navigateur');
console.log('- Vérifier les erreurs de compilation TypeScript');
console.log('- Vérifier les imports manquants');
console.log('- Vérifier les erreurs de syntaxe JavaScript');

console.log('\n🚀 EXÉCUTEZ LE SCRIPT ET PARTAGEZ LES RÉSULTATS !');
