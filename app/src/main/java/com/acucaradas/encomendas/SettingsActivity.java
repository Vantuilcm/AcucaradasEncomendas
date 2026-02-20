package com.acucaradas.encomendas;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.acucaradas.encomendas.utils.SessionManager;

public class SettingsActivity extends AppCompatActivity {

    private LinearLayout layoutProfile;
    private LinearLayout layoutNotifications;
    private LinearLayout layoutPrivacy;
    private LinearLayout layoutAccountDeletion;
    private LinearLayout layoutLogout;
    private TextView tvUserName;
    private TextView tvUserEmail;
    private SessionManager sessionManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_settings);

        // Configurar a toolbar
        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        getSupportActionBar().setTitle("Configurações");

        // Inicializar componentes
        layoutProfile = findViewById(R.id.layout_profile);
        layoutNotifications = findViewById(R.id.layout_notifications);
        layoutPrivacy = findViewById(R.id.layout_privacy);
        layoutAccountDeletion = findViewById(R.id.layout_account_deletion);
        layoutLogout = findViewById(R.id.layout_logout);
        tvUserName = findViewById(R.id.tv_user_name);
        tvUserEmail = findViewById(R.id.tv_user_email);

        // Inicializar gerenciador de sessão
        sessionManager = new SessionManager(this);

        // Configurar informações do usuário
        tvUserName.setText(sessionManager.getUserName());
        tvUserEmail.setText(sessionManager.getUserEmail());

        // Configurar listeners
        setupListeners();
    }

    private void setupListeners() {
        // Perfil
        layoutProfile.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivity(new Intent(SettingsActivity.this, ProfileActivity.class));
            }
        });

        // Notificações
        layoutNotifications.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // Implementar navegação para configurações de notificações
            }
        });

        // Privacidade
        layoutPrivacy.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // Implementar navegação para configurações de privacidade
            }
        });

        // Exclusão de Conta
        layoutAccountDeletion.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivity(new Intent(SettingsActivity.this, AccountDeletionActivity.class));
            }
        });

        // Logout
        layoutLogout.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                sessionManager.logout();
                Intent intent = new Intent(SettingsActivity.this, LoginActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                startActivity(intent);
                finish();
            }
        });
    }

    @Override
    public boolean onSupportNavigateUp() {
        onBackPressed();
        return true;
    }
}