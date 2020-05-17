'use babel';

module.exports = class StatusBarNotification{
    constructor() {
        this.element = document.createElement('div');
        this.element.setAttribute("id", "spell-checker-improved-status-bar-icon");
        this.element.classList.add('inline-block');
        this.setElementContent(this.element);
        console.log('the element', this.element);
    }

    setElementContent(element) {
        this.element.innerHTML =
            '<span>'+
                '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/grammar.svg">'+
                '<span class="working hidden">'+
                    '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/working.svg">'+
                '</span>'+
                '<span class="all-fine hidden">'+
                    '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/all-fine.svg">'+
                '</span>'+
                '<span class="misspelling hidden">'+
                    '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/misspelling.svg">'+
                '</span>'+
            '</span>';
    }

    working() {
    this.element.innerHTML =
    '<span>'+
        '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/grammar.svg">'+
        '<span class="working">'+
            '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/working.svg">'+
        '</span>'+
    '</span>';
    }

    allFine() {
      this.element.innerHTML =
      '<span>'+
          '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/grammar.svg">'+
          '<span class="all-fine">'+
              '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/all-fine.svg">'+
          '</span>'+
      '</span>';
    }

    misspelling() {
      this.element.innerHTML =
      '<span>'+
          '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/grammar.svg">'+
          '<span class="misspelling">'+
              '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/misspelling.svg">'+
          '</span>'+
      '</span>';
    }

    getElement() {
        return this.element;
    }

    removeElement() {
        this.element.classList.add("hidden");
    }
};
