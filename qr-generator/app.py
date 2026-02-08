from flask import Flask, render_template, request, url_for, flash, redirect
import qrcode
import io
import base64
import re
from datetime import datetime
import os
from dotenv import load_dotenv
load_dotenv()
app = Flask(__name__, static_folder='static', template_folder='templates')


app.secret_key = os.environ.get('FLASK_SECRET_KEY') or 'fallback-random-string-for-development'


# Определения размеров
SIZE_OPTIONS = [
    {
        'id': 'xs',
        'name': 'Очень малый',
        'box_size': 3,
        'border': 1,
        'desc': 'Для иконок и мелкого текста',
        'icon': 'bi-phone'
    },
    {
        'id': 's', 
        'name': 'Малый',
        'box_size': 5,
        'border': 2,
        'desc': 'Для веб-сайтов и документов',
        'icon': 'bi-tablet'
    },
    {
        'id': 'm',
        'name': 'Средний',
        'box_size': 10,
        'border': 4,
        'desc': 'Стандартный размер',
        'icon': 'bi-laptop'
    },
    {
        'id': 'l',
        'name': 'Большой',
        'box_size': 15,
        'border': 6,
        'desc': 'Для печати и постеров',
        'icon': 'bi-tv'
    },
    {
        'id': 'xl',
        'name': 'Очень большой',
        'box_size': 20,
        'border': 8,
        'desc': 'Для крупных дисплеев',
        'icon': 'bi-display'
    }
]

# Базовые цвета
COLOR_OPTIONS = [
    '#000000',  # Черный
    '#6c63ff',  # Основной фиолетовый
    '#dc3545',  # Красный
    '#0d6efd',  # Синий
    '#198754',  # Зеленый
    '#ffc107',  # Желтый
    '#fd7e14',  # Оранжевый
    '#6f42c1'   # Индиго
]

# Уровни коррекции ошибок
ERROR_CORRECTION = {
    'L': qrcode.constants.ERROR_CORRECT_L,
    'M': qrcode.constants.ERROR_CORRECT_M,
    'Q': qrcode.constants.ERROR_CORRECT_Q,
    'H': qrcode.constants.ERROR_CORRECT_H
}

# Описания уровней коррекции
ERROR_DESCRIPTIONS = {
    'L': 'L (Низкий, 7%)',
    'M': 'M (Средний, 15%)',
    'Q': 'Q (Высокий, 25%)',
    'H': 'H (Максимальный, 30%)'
}

def is_valid_hex_color(color):
    """Проверка валидности hex цвета"""
    if not color:
        return False
    if not color.startswith('#'):
        color = '#' + color
    pattern = re.compile(r'^#[0-9A-Fa-f]{6}$')
    return bool(pattern.match(color))

def get_contrast_color(color):
    """Получение контрастного цвета фона"""
    if not color:
        return '#ffffff'
    
    # Для темных цветов используем светлый фон, для светлых - темный
    if color.lower() == '#000000':
        return '#121212'  # Темный фон для черного QR
    elif color.lower() == '#ffffff':
        return '#f8f9fa'  # Светлый фон для белого QR
    
    try:
        # Преобразуем hex в RGB
        color = color.lstrip('#')
        if len(color) == 3:
            color = ''.join([c*2 for c in color])
        r, g, b = int(color[0:2], 16), int(color[2:4], 16), int(color[4:6], 16)
        
        # Вычисляем яркость (формула YIQ)
        brightness = (r * 299 + g * 587 + b * 114) / 1000
        
        # Если цвет яркий (>128), используем темный фон, иначе светлый
        return '#121212' if brightness > 128 else '#ffffff'
    except:
        return '#ffffff'  # По умолчанию светлый фон

def create_qr_code(data, box_size=10, border=4, fill_color='#000000', error_correction='M'):
    """Создание QR-кода с заданными параметрами"""
    # Валидация цвета
    if not is_valid_hex_color(fill_color):
        fill_color = '#000000'
    
    # Получаем цвет фона на основе цвета QR-кода
    back_color = get_contrast_color(fill_color)
    
    try:
        # Создаем QR-код
        qr = qrcode.QRCode(
            version=None,  # Автоопределение версии
            error_correction=ERROR_CORRECTION.get(error_correction, qrcode.constants.ERROR_CORRECT_M),
            box_size=box_size,
            border=border,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        # Создаем изображение
        img = qr.make_image(fill_color=fill_color, back_color=back_color)
        
        return qr, img, None
    except Exception as e:
        return None, None, str(e)

def get_qr_info(qr, img, data, selected_size, color, error_level):
    """Получение информации о сгенерированном QR-коде"""
    return {
        'version': qr.version,
        'size_px': img.size,
        'pixel_count': img.size[0] * img.size[1],
        'selected_size': selected_size,
        'data_length': len(data),
        'color': color,
        'error_level': ERROR_DESCRIPTIONS.get(error_level, 'M (Средний, 15%)'),
        'error_code': error_level,
        'background_color': get_contrast_color(color),
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }

@app.route('/', methods=['GET', 'POST'])
def index():
    qr_data_url = None
    qr_info = None
    
    if request.method == 'POST':
        # Получаем данные из формы
        data = request.form.get('data', '').strip()
        size_id = request.form.get('size', 'm')
        color = request.form.get('color', '#000000')
        error_level = request.form.get('error_correction', 'M')
        
        # Валидация данных
        if not data:
            flash('Пожалуйста, введите текст для QR-кода', 'error')
        elif len(data) > 1000:
            flash('Текст слишком длинный (максимум 1000 символов)', 'warning')
            data = data[:1000]
        else:
            # Находим выбранный размер
            selected_size = next(
                (s for s in SIZE_OPTIONS if s['id'] == size_id), 
                SIZE_OPTIONS[2]  # По умолчанию средний
            )
            
            # Генерируем QR-код
            qr, img, error = create_qr_code(
                data=data,
                box_size=selected_size['box_size'],
                border=selected_size['border'],
                fill_color=color,
                error_correction=error_level
            )
            
            if error:
                flash(f'Ошибка генерации QR-кода: {error}', 'error')
            else:
                # Получаем информацию о QR-коде
                qr_info = get_qr_info(qr, img, data, selected_size, color, error_level)
                
                # Конвертируем изображение в base64
                buffer = io.BytesIO()
                img.save(buffer, format='PNG', optimize=True)
                buffer.seek(0)
                
                qr_data_url = f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"
                
                flash('QR-код успешно сгенерирован!', 'success')
    
    # Подготовка данных для шаблона
    return render_template('index.html', 
                         qr_data_url=qr_data_url, 
                         qr_info=qr_info,
                         size_options=SIZE_OPTIONS,
                         color_options=COLOR_OPTIONS,
                         current_year=datetime.now().year)

@app.route('/api/generate', methods=['POST'])
def api_generate():
    """API endpoint для генерации QR-кода"""
    try:
        data = request.json.get('data', '').strip()
        if not data:
            return {'error': 'No data provided'}, 400
        
        # Параметры по умолчанию или из запроса
        size_id = request.json.get('size', 'm')
        color = request.json.get('color', '#000000')
        error_level = request.json.get('error_correction', 'M')
        
        # Находим выбранный размер
        selected_size = next(
            (s for s in SIZE_OPTIONS if s['id'] == size_id), 
            SIZE_OPTIONS[2]
        )
        
        # Генерируем QR-код
        qr, img, error = create_qr_code(
            data=data,
            box_size=selected_size['box_size'],
            border=selected_size['border'],
            fill_color=color,
            error_correction=error_level
        )
        
        if error:
            return {'error': error}, 500
        
        # Конвертируем в base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG', optimize=True)
        buffer.seek(0)
        
        qr_data_url = f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"
        
        return {
            'success': True,
            'qr_data_url': qr_data_url,
            'info': {
                'version': qr.version,
                'size_px': img.size,
                'selected_size': selected_size,
                'data_length': len(data),
                'color': color,
                'error_level': error_level
            }
        }
    except Exception as e:
        return {'error': str(e)}, 500

@app.route('/health')
def health_check():
    """Эндпоинт для проверки работоспособности"""
    return {'status': 'healthy', 'service': 'QR Generator API', 'timestamp': datetime.now().isoformat()}

@app.route('/robots.txt')
def robots():
    """Файл для поисковых роботов"""
    return """User-agent: *
Allow: /
Disallow: /api/
Sitemap: https://your-domain.com/sitemap.xml
"""

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    # Настройки для продакшена
    debug_mode = True  # Замените на False в продакшене
    
    app.run(
        debug=False,
        host='0.0.0.0', 
        port=5000,
        threaded=True
    )