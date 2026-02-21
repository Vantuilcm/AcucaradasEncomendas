"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
const fr = {
  save: 'Enregistrer',
  selectSingle: 'Sélectionner une date',
  selectMultiple: 'Sélectionner plusieurs dates',
  selectRange: 'Sélectionner une période',
  notAccordingToDateFormat: inputFormat => `La date doit être au format ${inputFormat}`,
  mustBeHigherThan: date => `La date doit être après le ${date}`,
  mustBeLowerThan: date => `La date doit être avant le ${date}`,
  mustBeBetween: (startDate, endDate) => `La date doit être en le ${startDate} et le ${endDate}`,
  dateIsDisabled: "Le jour n'est pas autorisé",
  previous: 'Précédent',
  next: 'Suivant',
  typeInDate: 'Entrer la date',
  pickDateFromCalendar: 'Sélectionner une date dans le calendrier',
  close: 'Fermer'
};
var _default = fr;
exports.default = _default;
//# sourceMappingURL=fr.js.map