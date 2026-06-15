<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $statements = [
            "CREATE TABLE IF NOT EXISTS room_types (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                code VARCHAR(50) NOT NULL UNIQUE,
                capacity INT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS rooms (
                id VARCHAR(255) PRIMARY KEY,
                room_number VARCHAR(50) NOT NULL UNIQUE,
                room_type_id VARCHAR(255) NOT NULL,
                floor INT NOT NULL,
                capacity INT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Vacant Clean',
                FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS rate_plans (
                id VARCHAR(255) PRIMARY KEY,
                room_type_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                night_price DOUBLE NOT NULL,
                day_use_price DOUBLE NOT NULL,
                hourly_prices JSON NOT NULL,
                FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS guests (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                mobile VARCHAR(50) NOT NULL UNIQUE,
                gender VARCHAR(50) NULL,
                dob VARCHAR(50) NULL,
                address TEXT NULL,
                nationality VARCHAR(100) NULL,
                id_type VARCHAR(100) NULL,
                id_number VARCHAR(100) NULL,
                photo_url VARCHAR(255) NULL,
                id_front_url VARCHAR(255) NULL,
                id_back_url VARCHAR(255) NULL,
                is_blacklisted TINYINT(1) DEFAULT 0,
                blacklist_reason TEXT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS reservations (
                id VARCHAR(255) PRIMARY KEY,
                reservation_number VARCHAR(255) NOT NULL UNIQUE,
                guest_id VARCHAR(255) NOT NULL,
                room_type_id VARCHAR(255) NOT NULL,
                room_id VARCHAR(255) NULL,
                stay_type VARCHAR(50) NOT NULL,
                check_in_datetime DATETIME NOT NULL,
                check_out_datetime DATETIME NOT NULL,
                status VARCHAR(50) NOT NULL,
                adults INT NOT NULL DEFAULT 1,
                children INT NOT NULL DEFAULT 0,
                remarks TEXT NULL,
                rate_plan_id VARCHAR(255) NULL,
                custom_rate DOUBLE NULL,
                created_at DATETIME NOT NULL,
                FOREIGN KEY (guest_id) REFERENCES guests(id),
                FOREIGN KEY (room_type_id) REFERENCES room_types(id),
                FOREIGN KEY (room_id) REFERENCES rooms(id),
                FOREIGN KEY (rate_plan_id) REFERENCES rate_plans(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS folios (
                id VARCHAR(255) PRIMARY KEY,
                reservation_id VARCHAR(255) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Open',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (reservation_id) REFERENCES reservations(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS folio_entries (
                id VARCHAR(255) PRIMARY KEY,
                folio_id VARCHAR(255) NOT NULL,
                entry_type VARCHAR(50) NOT NULL,
                charge_type VARCHAR(100) NULL,
                payment_method VARCHAR(100) NULL,
                description TEXT NOT NULL,
                debit DOUBLE DEFAULT 0,
                credit DOUBLE DEFAULT 0,
                balance DOUBLE DEFAULT 0,
                created_by VARCHAR(255) NOT NULL,
                created_at DATETIME NOT NULL,
                is_voided TINYINT(1) DEFAULT 0,
                FOREIGN KEY (folio_id) REFERENCES folios(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS audit_logs (
                id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255) NULL,
                username VARCHAR(255) NOT NULL,
                action VARCHAR(255) NOT NULL,
                old_value TEXT NULL,
                new_value TEXT NULL,
                timestamp DATETIME NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS maintenance_tickets (
                id VARCHAR(255) PRIMARY KEY,
                room_id VARCHAR(255) NOT NULL,
                issue TEXT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Open',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS housekeeping_tasks (
                id VARCHAR(255) PRIMARY KEY,
                room_id VARCHAR(255) NOT NULL,
                assigned_to VARCHAR(255) NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Pending',
                remarks TEXT NULL,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                checklist TEXT NULL,
                priority VARCHAR(50) DEFAULT 'medium',
                FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS property_settings (
                `key` VARCHAR(255) PRIMARY KEY,
                `value` TEXT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS taxes (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                rate DOUBLE NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS payment_methods (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                status VARCHAR(50) NOT NULL DEFAULT 'Active'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS gateway_settings (
                `key` VARCHAR(255) PRIMARY KEY,
                `value` TEXT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS role_permissions (
                role VARCHAR(100) NOT NULL,
                module VARCHAR(100) NOT NULL,
                access_level VARCHAR(50) NOT NULL,
                PRIMARY KEY (role, module)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS property_transactions (
                id VARCHAR(255) PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                amount DOUBLE NOT NULL,
                category VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                created_by VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS deposits (
                id VARCHAR(255) PRIMARY KEY,
                folio_id VARCHAR(255) NOT NULL,
                amount DOUBLE NOT NULL,
                payment_method VARCHAR(100) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Held',
                description TEXT NULL,
                created_by VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (folio_id) REFERENCES folios(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS refunds (
                id VARCHAR(255) PRIMARY KEY,
                folio_id VARCHAR(255) NOT NULL,
                amount DOUBLE NOT NULL,
                payment_method VARCHAR(100) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Pending Approval',
                reason TEXT NOT NULL,
                requested_by VARCHAR(255) NOT NULL,
                approved_by VARCHAR(255) NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (folio_id) REFERENCES folios(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS cash_registers (
                id VARCHAR(255) PRIMARY KEY,
                opened_at DATETIME NOT NULL,
                closed_at DATETIME NULL,
                opened_by VARCHAR(255) NOT NULL,
                closed_by VARCHAR(255) NULL,
                opening_cash DOUBLE DEFAULT 0,
                expected_cash DOUBLE DEFAULT 0,
                actual_cash DOUBLE DEFAULT 0,
                cash_discrepancy DOUBLE DEFAULT 0,
                total_card DOUBLE DEFAULT 0,
                total_upi DOUBLE DEFAULT 0,
                total_gateway DOUBLE DEFAULT 0,
                status VARCHAR(50) DEFAULT 'Open',
                notes TEXT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS housekeeping_history (
                id VARCHAR(255) PRIMARY KEY,
                task_id VARCHAR(255) NOT NULL,
                action VARCHAR(255) NOT NULL,
                performed_by VARCHAR(255) NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES housekeeping_tasks(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS whatsapp_conversations (
                id VARCHAR(255) PRIMARY KEY,
                mobile VARCHAR(50) NOT NULL UNIQUE,
                assigned_agent VARCHAR(255) NULL,
                status VARCHAR(50) DEFAULT 'Open',
                last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS whatsapp_messages (
                id VARCHAR(255) PRIMARY KEY,
                conversation_id VARCHAR(255) NOT NULL,
                mobile VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'Sent',
                template_name VARCHAR(255) NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES whatsapp_conversations(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS approval_requests (
                id VARCHAR(255) PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Pending Approval',
                requested_by VARCHAR(255) NOT NULL,
                created_at VARCHAR(255) NOT NULL,
                approved_by VARCHAR(255) NULL,
                approved_at VARCHAR(255) NULL,
                details TEXT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        ];

        foreach ($statements as $statement) {
            DB::statement($statement);
        }
    }

    public function down(): void
    {
        foreach ([
            'approval_requests',
            'whatsapp_messages',
            'whatsapp_conversations',
            'housekeeping_history',
            'cash_registers',
            'refunds',
            'deposits',
            'property_transactions',
            'role_permissions',
            'gateway_settings',
            'payment_methods',
            'taxes',
            'property_settings',
            'housekeeping_tasks',
            'maintenance_tickets',
            'audit_logs',
            'folio_entries',
            'folios',
            'reservations',
            'guests',
            'rate_plans',
            'rooms',
            'room_types',
        ] as $table) {
            DB::statement("DROP TABLE IF EXISTS {$table}");
        }
    }
};