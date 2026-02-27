#!/usr/bin/env python3
"""
Excel Parser for Donaciones Ieshiva
Parses Bueno7.xlsx and generates JSON files for import
"""

import pandas as pd
import json
import re
import uuid
from datetime import datetime

EXCEL_FILE = '/Users/ariel/Downloads/Bueno8.xlsx'

def normalize_name(name):
    """Convert name to Pascal Case"""
    if pd.isna(name) or name == '':
        return ''
    # Split by space and capitalize each word
    return ' '.join(word.capitalize() for word in str(name).split())

def parse_amount(value):
    """Parse amount from Excel, handling formulas like '=-450000' or '4*3000'"""
    if pd.isna(value) or value == '':
        return 0
    
    value_str = str(value).strip()
    
    # Handle negative formulas like "=-450000"
    if value_str.startswith('=-'):
        return abs(float(value_str[2:]))
    
    # Handle regular formulas  
    if value_str.startswith('='):
        try:
            return abs(eval(value_str[1:]))
        except:
            return 0
    
    # Try to convert to float
    try:
        return abs(float(value_str))
    except:
        return 0

def detect_currency(concepto_str):
    """Detect currency from concepto field"""
    if pd.isna(concepto_str):
        return 'pesos'
    concepto_lower = str(concepto_str).lower()
    if 'dolares' in concepto_lower or 'dólares' in concepto_lower or 'usd' in concepto_lower:
        return 'dolares'
    return 'pesos'

def clean_text(text):
    """Clean text field"""
    if pd.isna(text) or text == '' or text == '??' or text == '?':
        return None
    return str(text).strip()

def main():
    print("="*60)
    print("DONACIONES IESHIVA - EXCEL PARSER")
    print("="*60)
    print(f"Reading Excel file: {EXCEL_FILE}")
    print()
    
    # Read Excel file
    df = pd.read_excel(EXCEL_FILE)
    print(f"✓ Loaded {len(df)} rows")
    print(f"✓ Columns: {df.columns.tolist()}")
    print()
    
    # Expected columns (adjust if needed):
    # Apellido, Nombre, Perasha, Minian, Concepto, Fecha, Destino, Monto, OtroDestino, 
    # Aclaracion, Donacion/Cobranza, Cobrador
    
    donors_map = {}  # key: (apellido, nombre) -> donor_id
    donor_records = []
    donation_records = []
    payment_records = []
    
    concepts_set = set()
    destinations_set = set()
    collectors_set = set()
    
    print("Parsing rows...")
    
    for idx, row in df.iterrows():
        # Skip empty rows
        if pd.isna(row.get('Apellido')) and pd.isna(row.get('Nombre')):
            continue
        
        # Parse donor info
        apellido = normalize_name(row.get('Apellido', ''))
        nombre = normalize_name(row.get('Nombre', ''))
        
        if not nombre and not apellido:
            continue
        
        # Get observations from Aclaracion column
        observations = clean_text(row.get('Aclaración'))
        if observations and observations.startswith('Aclaración: '):
            observations = observations[12:]
        
        # Donor key includes Apellido + Nombre + Aclaracion
        donor_key = (apellido, nombre, observations or '')
        
        # Create donor if doesn't exist
        if donor_key not in donors_map:
            donor_id = str(uuid.uuid4())
            donors_map[donor_key] = donor_id
            
            donor_records.append({
                'id': donor_id,
                'first_name': nombre,
                'last_name': apellido,
                'observations': observations
            })
        else:
            donor_id = donors_map[donor_key]
        
        # Parse transaction data
        monto = parse_amount(row.get('Monto', 0))
        if monto == 0:
            continue
        
        concepto_raw = row.get('Concepto', '')
        currency = detect_currency(concepto_raw)
        
        perasha = clean_text(row.get('Perasha')) or 'Sin Especificar'
        minian = clean_text(row.get('Minian')) or 'Sin Especificar'
        
        # Parse concepto - remove currency info
        concepto = clean_text(concepto_raw)
        if concepto:
            concepto = re.sub(r'\b(dolares|dólares|usd|pesos)\b', '', concepto, flags=re.IGNORECASE).strip()
            if not concepto or concepto in ['?', '??']:
                concepto = None
        
        # Check if it's MI (matana)
        is_matana = bool(concepto and concepto.upper() == 'MI')
        
        destino = clean_text(row.get('Destino'))
        if destino == 'Kupá':
            destino = 'Kupa'  # Normalize
        if not destino or destino in ['?', '??']:
            destino = 'Sin Especificar'
        
        destino_otro = clean_text(row.get('OtroDestino'))
        cobrador = clean_text(row.get('Cobrador'))
        
        # Parse date
        fecha_val = row.get('Fecha')
        if pd.isna(fecha_val):
            fecha_str = datetime.now().strftime('%Y-%m-%d')
        else:
            if isinstance(fecha_val, str):
                try:
                    fecha_obj = pd.to_datetime(fecha_val)
                    fecha_str = fecha_obj.strftime('%Y-%m-%d')
                except:
                    fecha_str = datetime.now().strftime('%Y-%m-%d')
            else:
                fecha_str = fecha_val.strftime('%Y-%m-%d')
        
        # Determine transaction type
        tipo = clean_text(row.get('Donacion/Cobranza'))
        
        # If tipo is empty and destino is Ieshiva, default to Donacion
        if not tipo and destino == 'Ieshiva':
            tipo = 'Donacion'
        
        comment = clean_text(row.get('Aclaracion'))
        is_virtual = False  # Set to True if you want to mark specific records as virtual
        
        # Determine if donation or payment based on tipo or amount sign in original
        monto_orig = str(row.get('Monto', '')).strip()
        is_payment = tipo and 'cobranza' in tipo.lower()
        
        # Also check if original amount was negative (payment)
        if monto_orig.startswith('-') or monto_orig.startswith('=-'):
            is_payment = True
        
        if is_payment:
            # Payment record
            payment_records.append({
                'donor_id': donor_id,
                'currency': currency,
                'amount': monto,
                'date': fecha_str,
                'destination': destino,
                'collector': cobrador,
                'comment': comment,
                'is_virtual': is_virtual
            })
            
            if destino:
                destinations_set.add(destino)
            if cobrador:
                collectors_set.add(cobrador)
        else:
            # Donation record
            donation_records.append({
                'donor_id': donor_id,
                'currency': currency,
                'amount': 0 if is_matana else monto,
                'date': fecha_str,
                'perasha': perasha,
                'minian': minian,
                'concept': concepto,
                'destination': destino,
                'destination_other': destino_otro,
                'comment': comment,
                'is_virtual': is_virtual,
                'matana': is_matana
            })
            
            if concepto:
                concepts_set.add(concepto)
            if destino:
                destinations_set.add(destino)
        
        if (idx + 1) % 500 == 0:
            print(f"  Processed {idx + 1}/{len(df)} rows...")
    
    print(f"✓ Processed {len(df)} rows")
    print()
    
    # Add default values
    concepts_set.add('Sin Especificar')
    destinations_set.add('Sin Especificar')
    
    # Prepare lookups
    lookups = {
        'concepts': sorted(list(concepts_set)),
        'destinations': sorted(list(destinations_set)),
        'collectors': sorted(list(collectors_set))
    }
    
    # Save JSON files
    print("Saving JSON files...")
    
    with open('/tmp/donor_records.json', 'w', encoding='utf-8') as f:
        json.dump(donor_records, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved /tmp/donor_records.json ({len(donor_records)} donors)")
    
    with open('/tmp/donation_records.json', 'w', encoding='utf-8') as f:
        json.dump(donation_records, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved /tmp/donation_records.json ({len(donation_records)} donations)")
    
    with open('/tmp/payment_records.json', 'w', encoding='utf-8') as f:
        json.dump(payment_records, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved /tmp/payment_records.json ({len(payment_records)} payments)")
    
    with open('/tmp/lookups.json', 'w', encoding='utf-8') as f:
        json.dump(lookups, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved /tmp/lookups.json")
    print()
    
    # Print summary
    print("="*60)
    print("PARSING COMPLETE!")
    print("="*60)
    print(f"Donors:    {len(donor_records)}")
    print(f"Donations: {len(donation_records)}")
    print(f"Payments:  {len(payment_records)}")
    print(f"Matanas:   {sum(1 for d in donation_records if d['matana'])}")
    print()
    print(f"Concepts:      {len(lookups['concepts'])}")
    print(f"Destinations:  {len(lookups['destinations'])}")
    print(f"Collectors:    {len(lookups['collectors'])}")
    print()
    print("Next step: Run ./run_import.sh or python3 import_data.py")

if __name__ == '__main__':
    main()
