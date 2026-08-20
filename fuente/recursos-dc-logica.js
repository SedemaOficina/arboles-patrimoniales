/* Árboles patrimoniales · página de Recursos, versión Claude Design.
   Es contenido estático: no lee el registro ni calcula nada. La clase existe
   porque Claude Design la exige, y solo activa el menú. */
class Recursos extends DCLogic {
  componentDidMount() {
    (async () => {
      try { (await import("./assets/js/menu.js")).activarMenu(); } catch (e) { /* el menú es mejora, no requisito */ }
    })();
  }
  renderVals() { return {}; }
}
