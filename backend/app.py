from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import random
from datetime import datetime
import base64
from io import BytesIO
from PIL import Image
import numpy as np
from defect_detector import DefectDetector

app = Flask(__name__)
CORS(app)

# Initialize defect detector
detector = DefectDetector()

# Sample panel data storage (in production, use a database)
panel_data = {
    'panel_id': 'SP-001',
    'installation_date': '2023-01-15',
    'installation_current_rating': 8.5,  # Amperes
    'installation_voltage_rating': 36.0,  # Volts
    'installation_temperature': 25.0,  # Celsius
    'current_readings': [],
    'voltage_readings': [],
    'temperature_readings': [],
    'defect_history': [],
    'last_inspection': None
}

def simulate_current_reading():
    """Simulate current reading (normally from sensor)"""
    # Simulate degradation over time (8.5A -> ~7.5A range)
    base_current = 8.0 + random.uniform(-0.3, 0.5)
    return round(base_current, 2)

def simulate_voltage_reading():
    """Simulate voltage reading (normally from sensor)"""
    # Simulate voltage (36V -> ~34V range due to degradation)
    base_voltage = 34.5 + random.uniform(-0.5, 0.5)
    return round(base_voltage, 2)

def simulate_temperature_reading():
    """Simulate temperature reading (normally from sensor)"""
    # Temperature varies with time of day and weather
    base_temp = 35.0 + random.uniform(-5, 15)
    return round(base_temp, 1)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

@app.route('/api/panel/current-reading', methods=['GET'])
def get_current_reading():
    """Get current panel reading"""
    current = simulate_current_reading()
    voltage = simulate_voltage_reading()
    temperature = simulate_temperature_reading()
    timestamp = datetime.now().isoformat()
    
    # Store readings
    panel_data['current_readings'].append({'value': current, 'timestamp': timestamp})
    panel_data['voltage_readings'].append({'value': voltage, 'timestamp': timestamp})
    panel_data['temperature_readings'].append({'value': temperature, 'timestamp': timestamp})
    
    # Keep only last 1000 readings
    for key in ['current_readings', 'voltage_readings', 'temperature_readings']:
        if len(panel_data[key]) > 1000:
            panel_data[key] = panel_data[key][-1000:]
    
    return jsonify({
        'current': current,
        'voltage': voltage,
        'temperature': temperature,
        'timestamp': timestamp
    })

@app.route('/api/panel/info', methods=['GET'])
def get_panel_info():
    """Get panel information and ratings"""
    current_avg = np.mean([r['value'] for r in panel_data['current_readings'][-100:]]) if panel_data['current_readings'] else panel_data['installation_current_rating']
    voltage_avg = np.mean([r['value'] for r in panel_data['voltage_readings'][-100:]]) if panel_data['voltage_readings'] else panel_data['installation_voltage_rating']
    
    # Calculate health score
    current_efficiency = (current_avg / panel_data['installation_current_rating']) * 100
    voltage_efficiency = (voltage_avg / panel_data['installation_voltage_rating']) * 100
    health_score = (current_efficiency + voltage_efficiency) / 2
    
    condition = 'Excellent' if health_score > 90 else 'Good' if health_score > 75 else 'Fair' if health_score > 60 else 'Poor'
    
    return jsonify({
        'panel_id': panel_data['panel_id'],
        'installation_date': panel_data['installation_date'],
        'installation_current_rating': panel_data['installation_current_rating'],
        'installation_voltage_rating': panel_data['installation_voltage_rating'],
        'current_rating': round(current_avg, 2),
        'voltage_rating': round(voltage_avg, 2),
        'health_score': round(health_score, 1),
        'condition': condition,
        'defect_count': len([d for d in panel_data['defect_history'] if d.get('status') != 'resolved']),
        'last_inspection': panel_data['last_inspection']
    })

@app.route('/api/panel/defect-detect', methods=['POST'])
def detect_defects():
    """Detect defects in uploaded panel image"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No image file selected'}), 400
        
        # Read image
        image = Image.open(file.stream)
        image_array = np.array(image)
        
        # Detect defects using AI model
        defects = detector.detect_defects(image_array)
        
        # Store defect record
        defect_record = {
            'id': len(panel_data['defect_history']) + 1,
            'timestamp': datetime.now().isoformat(),
            'defects': defects,
            'status': 'active',
            'image_path': None  # In production, save image to storage
        }
        panel_data['defect_history'].append(defect_record)
        panel_data['last_inspection'] = datetime.now().isoformat()
        
        # Convert image to base64 for response
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'defects': defects,
            'image': f'data:image/png;base64,{img_str}',
            'timestamp': defect_record['timestamp']
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/panel/history', methods=['GET'])
def get_readings_history():
    """Get historical readings for charts"""
    limit = int(request.args.get('limit', 100))
    
    return jsonify({
        'current': panel_data['current_readings'][-limit:],
        'voltage': panel_data['voltage_readings'][-limit:],
        'temperature': panel_data['temperature_readings'][-limit:]
    })

@app.route('/api/panel/defects', methods=['GET'])
def get_defects():
    """Get all defect history"""
    return jsonify({
        'defects': panel_data['defect_history'],
        'total': len(panel_data['defect_history'])
    })

@app.route('/api/panel/predictive-maintenance', methods=['GET'])
def get_predictive_maintenance():
    """Get predictive maintenance insights"""
    if not panel_data['current_readings']:
        return jsonify({'error': 'Insufficient data'}), 400
    
    # Calculate trends
    recent_current = [r['value'] for r in panel_data['current_readings'][-30:]]
    older_current = [r['value'] for r in panel_data['current_readings'][-60:-30]] if len(panel_data['current_readings']) > 30 else recent_current
    
    current_trend = np.mean(recent_current) - np.mean(older_current) if len(older_current) > 0 else 0
    
    # Predict maintenance needs
    health_score = (np.mean(recent_current) / panel_data['installation_current_rating']) * 100
    defect_count = len([d for d in panel_data['defect_history'] if d.get('status') != 'resolved'])
    
    maintenance_priority = 'Low'
    days_until_maintenance = 90
    
    if health_score < 70 or defect_count > 5:
        maintenance_priority = 'High'
        days_until_maintenance = 7
    elif health_score < 80 or defect_count > 2:
        maintenance_priority = 'Medium'
        days_until_maintenance = 30
    
    recommendations = []
    if current_trend < -0.1:
        recommendations.append('Performance degradation detected. Consider cleaning and inspection.')
    if defect_count > 3:
        recommendations.append('Multiple defects detected. Schedule maintenance service.')
    if health_score < 75:
        recommendations.append('Panel efficiency below optimal. Professional assessment recommended.')
    
    return jsonify({
        'maintenance_priority': maintenance_priority,
        'days_until_maintenance': days_until_maintenance,
        'health_trend': 'decreasing' if current_trend < -0.05 else 'stable' if current_trend < 0.05 else 'improving',
        'recommendations': recommendations,
        'predicted_efficiency_30days': round(max(0, health_score - (current_trend * 30)), 1),
        'predicted_efficiency_90days': round(max(0, health_score - (current_trend * 90)), 1)
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')

