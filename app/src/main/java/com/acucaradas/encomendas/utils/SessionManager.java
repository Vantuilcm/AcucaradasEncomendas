package com.acucaradas.encomendas.utils;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Classe para gerenciar a sessão do usuário (login, logout, verificação de login)
 */
public class SessionManager {

    // Preferências compartilhadas
    private SharedPreferences pref;
    private SharedPreferences.Editor editor;
    private Context context;

    // Modo privado das preferências
    private static final int PRIVATE_MODE = 0;

    // Nome do arquivo de preferências
    private static final String PREF_NAME = "AcucaradasPref";

    // Chaves das preferências
    private static final String IS_LOGGED_IN = "IsLoggedIn";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_NAME = "name";
    private static final String KEY_EMAIL = "email";

    /**
     * Construtor
     */
    public SessionManager(Context context) {
        this.context = context;
        pref = context.getSharedPreferences(PREF_NAME, PRIVATE_MODE);
        editor = pref.edit();
    }

    /**
     * Cria a sessão de login
     */
    public void createLoginSession(long userId, String name, String email) {
        // Armazena o status de login como verdadeiro
        editor.putBoolean(IS_LOGGED_IN, true);

        // Armazena os dados do usuário nas preferências
        editor.putLong(KEY_USER_ID, userId);
        editor.putString(KEY_NAME, name);
        editor.putString(KEY_EMAIL, email);

        // Salva as alterações
        editor.commit();
    }

    /**
     * Verifica o status de login do usuário
     */
    public boolean isLoggedIn() {
        return pref.getBoolean(IS_LOGGED_IN, false);
    }

    /**
     * Obtém os dados do usuário armazenados nas preferências
     */
    public long getUserId() {
        return pref.getLong(KEY_USER_ID, -1);
    }

    public String getUserName() {
        return pref.getString(KEY_NAME, "");
    }

    public String getUserEmail() {
        return pref.getString(KEY_EMAIL, "");
    }

    /**
     * Limpa os dados da sessão
     */
    public void logout() {
        // Limpa todos os dados das preferências
        editor.clear();
        editor.commit();
    }
}