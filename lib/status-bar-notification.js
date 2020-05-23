'use babel';

module.exports = class StatusBarNotification{
    constructor() {
        this.element = document.createElement('div');
        this.element.setAttribute("id", "spell-checker-improved-status-bar-icon");
        this.element.classList.add('inline-block');
        this.setElementContent(this.element);
    }

    setElementContent(element) {
        this.element.innerHTML =
            '<span>'+
                '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/grammar.svg">'+
                '<span class="notification working hidden">'+
                    '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/working.svg">'+
                '</span>'+
                '<span class="notification all-fine hidden">'+
                    '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/all-fine.svg">'+
                '</span>'+
                '<span class="notification misspelling hidden">'+
                    '<img src="/home/marcel/.atom/packages/spell-checker-improved/lib/assets/misspelling.svg">'+
                '</span>'+
            '</span>';
    }

    hideAllNotifications(resolve) {
        Array.from(
            this.element.querySelectorAll('.notification:not(.hidden)')
        ).forEach(
            (element)=>element.classList.add('hidden')
        );
    }

    showNotification(notificationClass) {
        this.element.querySelectorAll('.notification' + notificationClass)[0].classList.remove('hidden');
    }

    working() {
        this.hideAllNotifications();
        this.showNotification('.working');
    }

    allFine() {
        this.hideAllNotifications();
        this.showNotification('.all-fine');
    }

    misspelling() {
        this.hideAllNotifications();
        this.showNotification('.misspelling');
    }

    getElement() {
        return this.element;
    }

    removeElement() {
        this.element.classList.add("hidden");
    }

    setMessage(message) {
        atom.tooltips.add(this.element, {title: message});
    }
};
