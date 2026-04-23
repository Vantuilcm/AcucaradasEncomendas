import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import process from 'process';

global.Buffer = Buffer;
global.process = process;

import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
