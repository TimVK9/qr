// Конфигурация
const CONFIG = {
    colorOptions: ['#000000', '#6c63ff', '#dc3545', '#0d6efd', '#198754', '#ffc107', '#fd7e14', '#6f42c1'],
    maxDataLength: 1000,
    defaultColor: '#000000',
    notificationDuration: 3000
};

// Утилиты
const Utils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    generateFilename(prefix = 'qr_code') {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        return `${prefix}_${timestamp}.png`;
    }
};

// Менеджер уведомлений
const NotificationManager = {
    show(message, type = 'info') {
        // Удаляем старые уведомления
        document.querySelectorAll('.position-fixed.bottom-0.end-0').forEach(el => {
            if (el.querySelector('.toast')) {
                el.remove();
            }
        });
        
        const bgClass = type === 'success' ? 'bg-success' : 
                       type === 'error' ? 'bg-danger' : 
                       type === 'warning' ? 'bg-warning' : 'bg-info';
        
        const title = type === 'success' ? 'Успешно!' : 
                     type === 'error' ? 'Ошибка!' : 
                     type === 'warning' ? 'Внимание!' : 'Информация';
        
        const toast = document.createElement('div');
        toast.className = 'position-fixed bottom-0 end-0 p-3';
        toast.style.zIndex = '1060';
        
        toast.innerHTML = `
            <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header ${bgClass} text-white">
                    <strong class="me-auto">${title}</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Закрыть"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Автоматическое скрытие
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, CONFIG.notificationDuration);
        
        // Закрытие по клику
        const closeBtn = toast.querySelector('[data-bs-dismiss="toast"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (toast.parentNode) {
                    toast.remove();
                }
            });
        }
    },

    showLoading(message = 'Пожалуйста, подождите...') {
        this.show(message, 'info');
    },

    showSuccess(message) {
        this.show(message, 'success');
    },

    showError(message) {
        this.show(message, 'error');
    },

    showWarning(message) {
        this.show(message, 'warning');
    }
};

// Менеджер цветов
const ColorManager = {
    init() {
        this.bindEvents();
        this.setupDefaultColor();
    },

    bindEvents() {
        // Обработка базовых цветов
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const color = e.currentTarget.getAttribute('data-color');
                this.selectColor(color, e.currentTarget);
                this.trackColorSelection(color);
            });
        });

        // Кастомный цвет
        const customColorBtn = document.getElementById('customColorBtn');
        if (customColorBtn) {
            customColorBtn.addEventListener('click', () => this.toggleColorPicker());
        }

        const applyColorBtn = document.getElementById('applyColorBtn');
        if (applyColorBtn) {
            applyColorBtn.addEventListener('click', () => this.applyCustomColor());
        }

        const customColorPicker = document.getElementById('customColorPicker');
        if (customColorPicker) {
            customColorPicker.addEventListener('input', (e) => {
                this.previewCustomColor(e.target.value);
            });
        }

        // Закрытие палитры при клике вне её
        document.addEventListener('click', (e) => {
            const colorPicker = document.getElementById('colorPickerPopup');
            const customBtn = document.getElementById('customColorBtn');
            
            if (colorPicker && customBtn && 
                !colorPicker.contains(e.target) && 
                !customBtn.contains(e.target)) {
                colorPicker.classList.remove('show');
            }
        });
    },

    selectColor(color, element = null) {
        // Снимаем выделение со всех цветов
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.remove('selected');
            opt.innerHTML = '';
        });
        
        const customBtn = document.getElementById('customColorBtn');
        if (customBtn) {
            customBtn.classList.remove('selected');
        }
        
        const colorPicker = document.getElementById('colorPickerPopup');
        if (colorPicker) {
            colorPicker.classList.remove('show');
        }
        
        // Выделяем выбранный цвет
        if (element) {
            element.classList.add('selected');
            element.innerHTML = '<i class="bi bi-check"></i>';
        }
        
        // Устанавливаем значение в скрытое поле
        const colorInput = document.getElementById('colorInput');
        if (colorInput) {
            colorInput.value = color;
        }
    },

    toggleColorPicker() {
        const colorPicker = document.getElementById('colorPickerPopup');
        const customBtn = document.getElementById('customColorBtn');
        
        if (colorPicker) {
            const isVisible = colorPicker.classList.contains('show');
            
            document.querySelectorAll('.color-picker-popup').forEach(popup => {
                popup.classList.remove('show');
            });
            
            if (!isVisible) {
                colorPicker.classList.add('show');
                
                // Снимаем выделение с обычных цветов
                document.querySelectorAll('.color-option').forEach(opt => {
                    opt.classList.remove('selected');
                    opt.innerHTML = '';
                });
                
                // Выделяем кастомную кнопку
                if (customBtn) {
                    customBtn.classList.add('selected');
                }
                
                // Устанавливаем текущий цвет в палитру
                const currentColor = document.getElementById('colorInput')?.value || CONFIG.defaultColor;
                const colorPickerInput = document.getElementById('customColorPicker');
                if (colorPickerInput && !CONFIG.colorOptions.includes(currentColor)) {
                    colorPickerInput.value = currentColor;
                    if (customBtn) {
                        customBtn.style.background = currentColor;
                    }
                }
            }
        }
    },

    previewCustomColor(color) {
        const customBtn = document.getElementById('customColorBtn');
        if (customBtn) {
            customBtn.style.background = color;
        }
    },

    applyCustomColor() {
        const colorPicker = document.getElementById('customColorPicker');
        const colorPickerPopup = document.getElementById('colorPickerPopup');
        
        if (colorPicker && colorPickerPopup) {
            const selectedColor = colorPicker.value;
            
            // Устанавливаем значение в скрытое поле
            const colorInput = document.getElementById('colorInput');
            if (colorInput) {
                colorInput.value = selectedColor;
            }
            
            // Обновляем внешний вид кастомной кнопки
            const customBtn = document.getElementById('customColorBtn');
            if (customBtn) {
                customBtn.style.background = selectedColor;
                customBtn.classList.add('selected');
            }
            
            // Скрываем палитру
            colorPickerPopup.classList.remove('show');
            
            this.trackColorSelection(selectedColor, true);
        }
    },

    setupDefaultColor() {
        const defaultColor = CONFIG.colorOptions[0]; // #000000
        const defaultElement = document.querySelector(`[data-color="${defaultColor}"]`);
        if (defaultElement) {
            this.selectColor(defaultColor, defaultElement);
        }
    },

    trackColorSelection(color, isCustom = false) {
        console.log(`[Analytics] Selected color: ${color}, custom: ${isCustom}`);
        // Здесь можно добавить отправку в Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'select_color', {
                'event_category': 'qr_color',
                'event_label': color,
                'custom': isCustom
            });
        }
    }
};

// Менеджер размеров
const SizeManager = {
    init() {
        this.bindEvents();
        this.setupDefaultSize();
    },

    bindEvents() {
        // Обработка кликов по кнопкам размера
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const radio = e.currentTarget.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    this.selectSizeButton(e.currentTarget);
                    this.trackSizeSelection(radio.value);
                    
                    // Прокрутка к выбору цвета
                    setTimeout(() => {
                        this.scrollToColorSection();
                    }, 300);
                }
            });
            
            // Установка начального состояния выбранной кнопки
            const radio = btn.querySelector('input[type="radio"]');
            if (radio && radio.checked) {
                this.selectSizeButton(btn);
            }
        });

        // Обработка изменений радиокнопок
        document.querySelectorAll('input[name="size"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const btn = e.target.closest('.size-btn');
                if (btn) {
                    this.selectSizeButton(btn);
                }
            });
        });
    },

    selectSizeButton(button) {
        // Снимаем выделение со всех кнопок
        document.querySelectorAll('.size-btn').forEach(b => {
            b.classList.remove('selected');
        });
        
        // Выделяем текущую кнопку
        button.classList.add('selected');
    },

    setupDefaultSize() {
        const defaultSize = 'm';
        const defaultButton = document.querySelector(`input[name="size"][value="${defaultSize}"]`)?.closest('.size-btn');
        if (defaultButton) {
            this.selectSizeButton(defaultButton);
        }
    },

    scrollToColorSection() {
        const colorSection = document.getElementById('colorSection');
        if (colorSection) {
            colorSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    },

    trackSizeSelection(size) {
        console.log(`[Analytics] Selected size: ${size}`);
        if (typeof gtag !== 'undefined') {
            gtag('event', 'select_size', {
                'event_category': 'qr_size',
                'event_label': size
            });
        }
    }
};

// Менеджер формы
const FormManager = {
    init() {
        this.bindEvents();
        this.setupAutoResize();
        this.setupInputValidation();
    },

    bindEvents() {
        const form = document.getElementById('qrForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Очистка ошибок при вводе
        const dataInput = document.getElementById('dataInput');
        if (dataInput) {
            dataInput.addEventListener('input', () => {
                this.clearValidationError(dataInput);
            });
        }
    },

    setupAutoResize() {
        const textarea = document.getElementById('dataInput');
        if (textarea) {
            textarea.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
        }
    },

    setupInputValidation() {
        const textarea = document.getElementById('dataInput');
        if (textarea) {
            // Ограничение длины текста
            textarea.addEventListener('input', Utils.debounce(() => {
                if (textarea.value.length > CONFIG.maxDataLength) {
                    NotificationManager.showWarning(`Текст ограничен ${CONFIG.maxDataLength} символами. Лишние символы будут обрезаны.`);
                    textarea.value = textarea.value.substring(0, CONFIG.maxDataLength);
                }
            }, 500));
        }
    },

    validateForm() {
        const textarea = document.getElementById('dataInput');
        if (!textarea) return false;

        const value = textarea.value.trim();
        
        if (value.length === 0) {
            this.showValidationError(textarea, 'Пожалуйста, введите текст для QR-кода');
            return false;
        }

        if (value.length > CONFIG.maxDataLength) {
            this.showValidationError(textarea, `Текст не должен превышать ${CONFIG.maxDataLength} символов`);
            return false;
        }

        return true;
    },

    showValidationError(element, message) {
        element.classList.add('is-invalid');
        element.focus();
        
        let errorDiv = element.parentElement.querySelector('.invalid-feedback');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            element.parentElement.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
    },

    clearValidationError(element) {
        element.classList.remove('is-invalid');
        const errorDiv = element.parentElement.querySelector('.invalid-feedback');
        if (errorDiv) {
            errorDiv.remove();
        }
    },

    handleSubmit(e) {
        if (!this.validateForm()) {
            e.preventDefault();
            return false;
        }

        // Трекинг отправки формы
        this.trackFormSubmission();
        
        // Показываем индикатор загрузки
        this.showLoadingIndicator();
    },

    showLoadingIndicator() {
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn) {
            const originalText = generateBtn.innerHTML;
            generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Генерация...';
            generateBtn.disabled = true;
            
            // Восстанавливаем кнопку через 5 секунд (на случай ошибки)
            setTimeout(() => {
                if (generateBtn.disabled) {
                    generateBtn.innerHTML = originalText;
                    generateBtn.disabled = false;
                }
            }, 5000);
        }
    },

    trackFormSubmission() {
        const size = document.querySelector('input[name="size"]:checked')?.value || 'm';
        const color = document.getElementById('colorInput')?.value || CONFIG.defaultColor;
        const errorCorrection = document.getElementById('errorCorrectionSelect')?.value || 'M';
        
        console.log(`[Analytics] Form submitted: size=${size}, color=${color}, error=${errorCorrection}`);
        
        if (typeof gtag !== 'undefined') {
            gtag('event', 'submit_form', {
                'event_category': 'qr_generation',
                'event_label': `size:${size}, color:${color}, error:${errorCorrection}`
            });
        }
    }
};

// Менеджер результатов QR-кода
const QRResultManager = {
    init() {
        this.bindEvents();
        this.checkForQRResult();
    },

    bindEvents() {
        // Кнопка "Создать еще"
        const createAnotherBtn = document.getElementById('createAnotherBtn');
        const makeAnotherBtn = document.getElementById('makeAnotherBtn');
        if (createAnotherBtn) createAnotherBtn.addEventListener('click', () => this.makeAnotherQR());
        if (makeAnotherBtn) makeAnotherBtn.addEventListener('click', () => this.makeAnotherQR());

        // Кнопка "Поделиться"
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) shareBtn.addEventListener('click', () => this.shareQR());

        // Кнопка "Копировать"
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) copyBtn.addEventListener('click', () => this.copyQRUrl());

        // Кнопка "Вернуться к форме"
        const backToFormBtn = document.getElementById('backToFormBtn');
        if (backToFormBtn) backToFormBtn.addEventListener('click', () => this.scrollToForm());

        // Управление кнопкой "Вернуться к форме" при скролле
        window.addEventListener('scroll', Utils.debounce(() => this.toggleBackToFormButton(), 100));
        this.toggleBackToFormButton();
    },

    checkForQRResult() {
        const hasQRCode = document.querySelector('.qr-image') !== null;
        if (hasQRCode) {
            setTimeout(() => {
                this.scrollToResult();
            }, 100);
        }
    },

    makeAnotherQR() {
        this.scrollToForm();
        const dataInput = document.getElementById('dataInput');
        if (dataInput) {
            dataInput.focus();
            dataInput.value = ''
            dataInput.select();
        }
        
        NotificationManager.showSuccess('Можете создать новый QR-код!');
    },

    async shareQR() {
        if (navigator.share) {
            try {
                const qrImage = document.querySelector('.qr-image');
                const title = 'QR код создан с помощью онлайн генератора';
                const text = 'Я создал QR-код с помощью бесплатного онлайн генератора';
                
                if (qrImage) {
                    // Пытаемся поделиться файлом
                    const response = await fetch(qrImage.src);
                    const blob = await response.blob();
                    const file = new File([blob], 'qr_code.png', { type: 'image/png' });
                    
                    await navigator.share({
                        files: [file],
                        title: title,
                        text: text
                    });
                } else {
                    await navigator.share({
                        title: title,
                        text: text,
                        url: window.location.href
                    });
                }
                
                NotificationManager.showSuccess('QR-код успешно отправлен!');
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Ошибка при отправке:', error);
                    this.copyQRUrl();
                }
            }
        } else {
            this.copyQRUrl();
        }
    },

    copyQRUrl() {
        const qrImage = document.querySelector('.qr-image');
        if (qrImage) {
            const url = qrImage.src;
            
            navigator.clipboard.writeText(url).then(() => {
                NotificationManager.showSuccess('Ссылка на QR-код скопирована в буфер обмена!');
            }).catch(err => {
                console.error('Ошибка копирования: ', err);
                NotificationManager.showError('Не удалось скопировать в буфер обмена');
            });
        }
    },

    scrollToForm() {
        const formElement = document.getElementById('generatorForm');
        if (formElement) {
            formElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    },

    scrollToResult() {
        const resultElement = document.getElementById('qrResult');
        if (resultElement) {
            resultElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    },

    toggleBackToFormButton() {
        const backToFormBtn = document.getElementById('backToFormBtn');
        const resultElement = document.getElementById('qrResult');
        
        if (resultElement && backToFormBtn) {
            const resultPosition = resultElement.offsetTop;
            const scrollPosition = window.scrollY + window.innerHeight / 2;
            
            if (scrollPosition > resultPosition) {
                backToFormBtn.classList.add('show');
            } else {
                backToFormBtn.classList.remove('show');
            }
        }
    }
};

// Менеджер FAQ
const FAQManager = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        const faqAccordion = document.getElementById('faqAccordion');
        if (faqAccordion) {
            const accordionButtons = faqAccordion.querySelectorAll('.accordion-button');
            accordionButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const targetId = e.currentTarget.getAttribute('data-bs-target').substring(1);
                    this.trackFAQClick(targetId);
                });
            });
        }
    },

    trackFAQClick(faqId) {
        console.log(`[Analytics] FAQ clicked: ${faqId}`);
        if (typeof gtag !== 'undefined') {
            gtag('event', 'click_faq', {
                'event_category': 'faq',
                'event_label': faqId
            });
        }
    }
};

// Инициализация приложения
class QRGeneratorApp {
    constructor() {
        this.modules = [
            ColorManager,
            SizeManager,
            FormManager,
            QRResultManager,
            FAQManager
        ];
    }

    init() {
        console.log('QR Generator App Initializing...');
        
        // Инициализация всех модулей
        this.modules.forEach(module => {
            try {
                module.init();
                console.log(`${module.constructor.name} initialized`);
            } catch (error) {
                console.error(`Error initializing ${module.constructor.name}:`, error);
            }
        });
        
        // Настройка темы
        this.setupTheme();
        
        // Проверка поддержки браузера
        this.checkBrowserSupport();
        
        console.log('QR Generator App Initialized Successfully');
    }

    setupTheme() {
        // Сохранение предпочтений темы
        const theme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-bs-theme', theme);
    }

    checkBrowserSupport() {
        // Проверка поддержки необходимых API
        if (!HTMLCanvasElement.prototype.toBlob) {
            NotificationManager.showWarning('Ваш браузер устарел. Некоторые функции могут работать некорректно.');
        }
        
        // Проверка поддержки Web Share API
        if (!navigator.share) {
            console.log('Web Share API не поддерживается');
        }
        
        // Проверка поддержки Clipboard API
        if (!navigator.clipboard) {
            console.log('Clipboard API не поддерживается');
        }
    }
}

// Запуск приложения когда DOM загружен
document.addEventListener('DOMContentLoaded', () => {
    const app = new QRGeneratorApp();
    app.init();
});

// Экспорт для использования в консоли (опционально)
if (typeof window !== 'undefined') {
    window.QRGeneratorApp = QRGeneratorApp;
    window.NotificationManager = NotificationManager;
}