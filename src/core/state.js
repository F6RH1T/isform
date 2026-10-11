/* Modüller arası paylaşılan, değişebilen uygulama durumu.
   (ES modüllerinde içe aktarılan bir `let` değişkenine başka modülden atama yapılamaz; bu yüzden tek nesnede tutulur.) */
export const state = {
  aktifRol: "",
  rolHazir: Promise.resolve(false),
  aktifKullaniciMail: "",
  guncellenecekDocId: null,
  guncellenecekEskiAramaFirma: "",
  tumFormlarGlobal: [],
  raporSehirVeri: {},
};
