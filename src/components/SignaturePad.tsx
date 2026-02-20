import React, { useState, useRef } from 'react';
import { View, StyleSheet, PanResponder, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Button, Text, IconButton } from 'react-native-paper';

interface SignaturePadProps {
  onSave: (signatureBase64: string) => void;
  onClear?: () => void;
  onDrawStart?: () => void;
  onDrawEnd?: () => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClear, onDrawStart, onDrawEnd }) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [paths, setPaths] = useState<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M${locationX} ${locationY}`);
        setIsDrawing(true);
        if (onDrawStart) onDrawStart();
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => `${prev} L${locationX} ${locationY}`);
      },
      onPanResponderRelease: () => {
        setPaths((prev) => [...prev, currentPath]);
        setCurrentPath('');
        setIsDrawing(false);
        if (onDrawEnd) onDrawEnd();
      },
      onPanResponderTerminate: () => {
        setCurrentPath('');
        setIsDrawing(false);
        if (onDrawEnd) onDrawEnd();
      },
    })
  ).current;

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
    if (onClear) onClear();
  };

  const handleConfirm = () => {
    if (paths.length === 0) return;
    
    // Simplificando: Em um cenário real com bibliotecas dedicadas, converteríamos para imagem.
    // Como estamos criando do zero para evitar dependências, vamos simular o salvamento.
    // Em uma implementação futura, poderíamos usar react-native-view-shot para capturar o SVG como imagem.
    // Por enquanto, vamos passar uma string que representa os caminhos do SVG.
    const svgData = `<svg width="300" height="150" viewBox="0 0 300 150">${paths.map(p => `<path d="${p}" fill="none" stroke="black" stroke-width="2" />`).join('')}</svg>`;
    onSave(svgData);
  };

  return (
    <View style={styles.container}>
      <View style={styles.padContainer} {...panResponder.panHandlers}>
        <Svg style={StyleSheet.absoluteFill}>
          {paths.map((path, index) => (
            <Path
              key={`path-${index}`}
              d={path}
              stroke="black"
              strokeWidth={2}
              fill="none"
            />
          ))}
          {isDrawing && (
            <Path
              d={currentPath}
              stroke="black"
              strokeWidth={2}
              fill="none"
            />
          )}
        </Svg>
      </View>
      <View style={styles.actions}>
        <Button mode="text" onPress={handleClear} icon="delete">
          Limpar
        </Button>
        <Button 
          mode="contained" 
          onPress={handleConfirm} 
          disabled={paths.length === 0}
          style={styles.confirmButton}
        >
          Confirmar Assinatura
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: '100%',
  },
  padContainer: {
    height: 150,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  confirmButton: {
    backgroundColor: '#6200ee',
  },
});

export default SignaturePad;
